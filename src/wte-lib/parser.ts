import { downloadImagesLocally } from "./scraper.js";
import * as cheerio from "cheerio";
import {
    type Chapter,
    type EpubItem,
    type ImageOptions,
    ParsingType,
    type ScrapingOptions,
} from "./structs.js";
import type { PageWithCursor } from "puppeteer-real-browser";

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
    page: PageWithCursor,
    chapter: Chapter,
    stagingPath: string,
    parsingType: ParsingType,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions
): Promise<EpubItem[]> {
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
        return [];
    }

    let items = await parseImages(page, chapter, stagingPath, $, scrapingOps, imageOps);

    chapter.content = $.html();

    return items;
}

export async function parseImages(
    page: PageWithCursor,
    chapter: Chapter,
    stagingPath: string,
    $: cheerio.CheerioAPI,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions
): Promise<EpubItem[]> {
    let imageURLs: string[] = [];
    $("img").each((_, ele) => {
        let $ele = $(ele);
        if (!$ele.attr("src")) return;
        imageURLs.push($ele.attr("src")!);
    });

    if (imageURLs.length === 0) {
        return [];
    }

    let imagePaths = await downloadImagesLocally(
        page,
        chapter.url,
        stagingPath,
        imageURLs,
        scrapingOps,
        imageOps
    );

    let items: EpubItem[] = []

    $("img").each((_, ele) => {
        let $ele = $(ele);
        if (!$ele.attr("src")) return;
        let item = imagePaths[$ele.attr("src")!];
        if (!item) {
            $ele.unwrap();
            $ele.remove();
        } else {
            items.push(item)
            $ele.attr("src", `../${item.path}`);
        }
    });

    return items;
}
