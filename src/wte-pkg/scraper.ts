import {
    type Chapter,
    type ChapterSkeleton,
    type EpubItem,
    type ImageOptions,
    type Metadata,
    ParsingType,
    type ScrapingOptions,
} from "./structs.js";
import sharp from "sharp";
import { processImage } from "./image.js";
import { ERRORS } from "./strings.js";
import { v4 as uuidv4 } from "uuid";
import { PromisePool } from "@supercharge/promise-pool";
import { findCorrectScraper } from "../scrapers/scaperBucket.js";
import { Scraper } from "../scrapers/baseScraper.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";
import { createNewPage } from "./connection.js";
import { IMAGE_DIR, TEXT_DIR } from "./epub.js";
import { join } from "path";
import { parseChapter } from "./parser.js";
import { writeFile } from "fs/promises";
import { createChapterXHTML } from "./xhtml.js";

const MAX_TRIES = 3;

export async function getNovelMetadata(
    url: string,
    connection: ConnectResult,
    scrapingOps: ScrapingOptions
): Promise<Metadata> {
    let scraper = await getInitializedScraper(url, connection, scrapingOps);
    if (!scraper) throw new Error(ERRORS.ScraperNotFound(url));

    let title = await scraper.getTitle();
    let author = await scraper.getAuthor();
    let coverImageURL = await scraper.getCoverImage();

    return {
        title,
        author,
        coverImageURL,
    };
}

export async function getChapterList(
    url: string,
    connection: ConnectResult,
    scrapingOps: ScrapingOptions
): Promise<ChapterSkeleton[]> {
    let scraper = await getInitializedScraper(url, connection, scrapingOps);
    if (!scraper) throw new Error(ERRORS.ScraperNotFound(url));

    return scraper.getAllChapters();
}

export async function processAndWriteChapters(
    url: string,
    stagingPath: string,
    chapterSkeletons: ChapterSkeleton[],
    connection: ConnectResult,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions,
    parsingType: ParsingType
): Promise<EpubItem[]> {
    let scraper = await getInitializedScraper(url, connection, scrapingOps);
    if (!scraper) throw new Error(ERRORS.ScraperNotFound(url));

    let chapters: EpubItem[] = [];

    await PromisePool.withConcurrency(scrapingOps.concurrency)
        .for(chapterSkeletons)
        .process(async (skeleton) => {
            let page = await createNewPage(
                connection,
                parsingType == ParsingType.WithImage
            );
            let tries = 0;
            let chapter: Chapter = { ...skeleton, content: "" };
            while (tries < MAX_TRIES) {
                try {
                    let content = await scraper.scrapeChapter(
                        page,
                        skeleton,
                        parsingType
                    );
                    chapter.content = content;
                } catch (e) {
                    tries++;
                }
            }

            if (tries >= MAX_TRIES) {
                throw new Error(ERRORS.FailedToScrape(skeleton.url));
            }

            tries = 0;
            while (tries < MAX_TRIES) {
                try {
                    await parseChapter(
                        page,
                        chapter,
                        stagingPath,
                        parsingType,
                        scrapingOps,
                        imageOps
                    );
                } catch (e) {
                    tries++;
                }
            }

            if (tries >= MAX_TRIES) {
                throw new Error(ERRORS.FailedToParse(skeleton.url));
            }

            let id = uuidv4();
            let path = join(stagingPath, "OEBPS", TEXT_DIR, `${id}.xhtml`);
            await writeFile(path, createChapterXHTML(chapter));

            chapters.push({
                id,
                path: `${TEXT_DIR}/${id}.xhtml`,
                type: "application/xhtml+xml",
            });
        });

    return chapters;
}

export async function downloadImagesLocally(
    page: PageWithCursor,
    pageURL: string,
    stagingPath: string,
    fileURLs: string[],
    scrapingOps: ScrapingOptions,
    imageOptions: ImageOptions
): Promise<{ [key: string]: EpubItem }> {
    let tries = 0;
    let success = false;
    let filePaths: { [key: string]: EpubItem } = {};

    const promise: Promise<boolean> = new Promise((resolve) => {
        let timeoutResolve = setTimeout(
            () => resolve(true),
            scrapingOps.timeout
        );

        page.on("response", async (response) => {
            if (fileURLs.length === 0) {
                clearTimeout(timeoutResolve);
                resolve(true);
            }
            if (fileURLs.includes(response.url())) {
                let id = uuidv4();
                let extension =
                    response.url().split("/").at(-1)!.split(".")[1]?.trim() ??
                    "png";
                let path = join(
                    stagingPath,
                    "OEBPS",
                    IMAGE_DIR,
                    `${id}.${extension}`
                );
                try {
                    let buffer = await response.buffer();
                    let image = await processImage(sharp(buffer), imageOptions);
                    await image.toFile(path);
                    filePaths[response.url()] = {
                        path: `${IMAGE_DIR}/${`${id}.${extension}`}`,
                        id,
                        type: `image/${extension}`,
                    };
                    fileURLs = fileURLs.filter((r) => r != response.url());
                } catch (e) {}
            }
        });
    });

    while (!success && tries < MAX_TRIES) {
        try {
            page.goto(pageURL);
            success = await promise;
            tries++;
        } catch (e) {}
    }

    return filePaths;
}

export async function getInitializedScraper(
    url: string,
    connection: ConnectResult,
    scrapingOps: ScrapingOptions
): Promise<Scraper | undefined> {
    let parser = findCorrectScraper(url);
    if (!parser) {
        return undefined;
    }

    await parser.initialize(url, connection, scrapingOps);

    return parser;
}
