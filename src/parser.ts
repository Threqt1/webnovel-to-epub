import { Page } from "puppeteer-core";
import { createNewPage, downloadImagesLocally } from "./scraper.js";
import * as cheerio from "cheerio";

import { PromisePool } from "@supercharge/promise-pool";
import {
    Chapter,
    ConnectionInfo,
    ImageOptions,
    ParsingType,
    ScrapingOptions,
    Webnovel,
} from "./structs.js";
import { MultiProgressBars } from "multi-progress-bars";
import { DefaultProgressBarCustomization } from "./logger.js";

const MAX_TRIES = 3;

export async function parseWebnovel(
    webnovel: Webnovel,
    connectionInfo: ConnectionInfo,
    parsingType: ParsingType,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let pages: Page[] = [];

    for (let i = 0; i < scrapingOps.concurrency; i++) {
        let newPage = await createNewPage(connectionInfo, true);
        pages.push(newPage);
    }

    pb.addTask(`parsing`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => `parsing chapters...`,
        message: `0/${webnovel.chapters.length}`,
        type: "percentage",
    });

    let increment = 1 / webnovel.chapters.length;
    let finished = 0;

    await PromisePool.withConcurrency(scrapingOps.concurrency)
        .for(webnovel.chapters)
        .onTaskFinished(() => {
            finished++;
            pb.incrementTask(`parsing`, {
                percentage: increment,
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
                        parsingType,
                        scrapingOps,
                        imageOps
                    );
                } catch (e) {
                    tries++;
                }
            }

            pages.push(page);
            return true;
        });

    pb.done(`parsing`, {
        nameTransformFn: () => `parsed chapters`,
    });

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
    parsingType: ParsingType,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions
): Promise<void> {
    let $ = cheerio.load(chapter.content);

    let realBannedTags =
        parsingType === ParsingType.WithImage
            ? BANNED_TAGS
            : BANNED_TAGS.concat("img");

    $(realBannedTags.join(", ")).each((_, ele) => {
        let $ele = $(ele);
        $ele.unwrap();
        $ele.remove();
    });

    if (parsingType === ParsingType.WithFormat) {
        chapter.content = $.html();
        chapter.hasBeenParsed = true;
        return;
    }

    await parseImages(page, chapter, $, scrapingOps, imageOps);

    chapter.content = $.html();
    chapter.hasBeenParsed = true;

    return;
}

export async function parseImages(
    page: Page,
    chapter: Chapter,
    $: cheerio.CheerioAPI,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions
): Promise<void> {
    let imageURLs: string[] = [];
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
        scrapingOps,
        imageOps
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
