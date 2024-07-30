import { Page } from "puppeteer";
import { Chapter, Webnovel } from "./json.js";
import {
    createNewPage,
    downloadImagesLocally,
    PuppeteerConnectionInfo,
} from "./scraper.js";
import * as cheerio from "cheerio";
import { MultiProgressBars } from "multi-progress-bars";
import { DefaultProgressBarCustomization } from "./logger.js";
import { PromisePool } from "@supercharge/promise-pool";
import chalk from "chalk";
import { ImageOptions, ParserOptions, ParserType } from "./cli.js";

const MAX_TRIES = 3;

export async function parseWebnovel(
    connectionInfo: PuppeteerConnectionInfo,
    webnovel: Webnovel,
    parserOptions: ParserOptions,
    imageOptions: ImageOptions,
    pb: MultiProgressBars
): Promise<Webnovel> {
    pb.addTask(`Parsing Chapters ${webnovel.title}`, {
        ...DefaultProgressBarCustomization,
        type: "percentage",
        message: `0/${webnovel.chapters.length}`,
        nameTransformFn: () => {
            return `Parsing Chapters (${chalk.dim(webnovel.title)})`;
        },
    });

    let incrementPerChapter = 1 / webnovel.chapters.length;
    let finished = 0;

    let pages: Page[] = [];
    for (let i = 0; i < parserOptions.concurrencyPages; i++) {
        let newPage = await createNewPage(connectionInfo, true);
        pages.push(newPage);
    }

    await PromisePool.withConcurrency(parserOptions.concurrencyPages)
        .for(webnovel.chapters)
        .onTaskFinished(() => {
            finished++;
            pb.incrementTask(`Parsing Chapters ${webnovel.title}`, {
                percentage: incrementPerChapter,
                message: `${finished}/${webnovel.chapters.length}`,
            });
        })
        .process(async (chapter) => {
            if (chapter.hasBeenParsed) return true;
            let page = pages.pop();
            let tries = 0;
            while (!chapter.hasBeenParsed && tries < MAX_TRIES) {
                try {
                    await parseChapter(
                        page,
                        chapter,
                        parserOptions,
                        imageOptions
                    );
                } catch (e) {
                    tries++;
                }
            }

            pages.push(page);
            return true;
        });

    pb.done(`Parsing Chapters ${webnovel.title}`);

    for (let page of pages) {
        await page.close();
    }

    return webnovel;
}

const BANNED_TAGS = [
    "script",
    "video",
    "audio",
    "iframe",
    "input",
    "button",
    "form",
    "canvas",
    "embed",
    "figure",
    "search",
    "select",
];

export async function parseChapter(
    page: Page,
    chapter: Chapter,
    parserOptions: ParserOptions,
    imageOptions: ImageOptions
): Promise<void> {
    let $ = cheerio.load(chapter.content);

    let realBannedTags =
        parserOptions.parserType === ParserType.WithImage
            ? BANNED_TAGS
            : BANNED_TAGS.concat("img");

    $(realBannedTags.join(", ")).each((_, ele) => {
        let $ele = $(ele);
        $ele.unwrap();
        $ele.remove();
    });

    if (parserOptions.parserType === ParserType.WithFormat) {
        chapter.content = $.html();
        chapter.hasBeenParsed = true;
        return;
    }

    await parseImages(page, chapter, $, parserOptions, imageOptions);

    chapter.content = $.html();
    chapter.hasBeenParsed = true;

    return;
}

export async function parseImages(
    page: Page,
    chapter: Chapter,
    $: cheerio.CheerioAPI,
    parserOptions: ParserOptions,
    imageOptions: ImageOptions
): Promise<void> {
    let imageURLs = [];
    $("img").each((_, ele) => {
        let $ele = $(ele);
        imageURLs.push($ele.attr("src"));
    });

    if (imageURLs.length === 0) {
        return;
    }

    let imagePaths = await downloadImagesLocally(
        page,
        chapter.url,
        imageURLs,
        parserOptions.timeout,
        imageOptions
    );

    $("img").each((_, ele) => {
        let $ele = $(ele);
        let path = imagePaths[$ele.attr("src")];
        if (!path) {
            $ele.unwrap();
            $ele.remove();
        } else {
            $ele.attr("src", `file://${path}`);
        }
    });

    return;
}
