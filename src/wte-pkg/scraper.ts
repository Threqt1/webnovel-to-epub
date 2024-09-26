import {
    type Chapter,
    type ChapterEpubItem,
    type ChapterSkeleton,
    type EpubItem,
    type ImageOptions,
    type Metadata,
    ParsingType,
    type ScrapingOptions,
} from "./structs.js";
import sharp from "sharp";
import { processImage } from "./image.js";
import { EPUB_ITEM_TYPES, ERRORS } from "./strings.js";
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

export async function getScraperForURL(url: string, connection: ConnectResult, scrapingOps: ScrapingOptions): Promise<Scraper> {
    let scraper = findCorrectScraper(url);
    if (!scraper) throw new Error(ERRORS.ScraperNotFound(url));

    await scraper.initialize(url, connection, scrapingOps);

    return scraper
}

export async function getNovelMetadata(
    scraper: Scraper
): Promise<Metadata> {
    let title = await scraper.getTitle();
    let author = await scraper.getAuthor();

    return {
        title,
        author,
        id: uuidv4()
    };
}

export async function getNovelCoverImage(scraper: Scraper, connection: ConnectResult, stagingPath: string, scrapingOps: ScrapingOptions, imageOps: ImageOptions,): Promise<EpubItem> {
    let coverImageURL = await scraper.getCoverImage()
    return (await downloadImagesLocally(connection.page, coverImageURL, stagingPath, [coverImageURL], scrapingOps, imageOps))[coverImageURL]!
}

export async function getChapterList(
    scraper: Scraper,
): Promise<ChapterSkeleton[]> {
    return scraper.getAllChapters();
}

export async function processAndWriteChapters(
    connection: ConnectResult,
    scraper: Scraper,
    stagingPath: string,
    chapterSkeletons: ChapterSkeleton[],
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions,
    parsingType: ParsingType
): Promise<[ChapterEpubItem[], EpubItem[]]> {
    let chapters: ChapterEpubItem[] = [];
    let items: EpubItem[] = []

    await PromisePool.withConcurrency(scrapingOps.concurrency)
        .for(chapterSkeletons)
        .process(async (skeleton) => {
            let page = await createNewPage(
                connection,
                parsingType == ParsingType.WithImage
            );
            let chapter: Chapter = { ...skeleton, content: "" };

            let tries = 0;
            let success = false
            while (!success && tries < MAX_TRIES) {
                try {
                    let content = await scraper.scrapeChapter(
                        page,
                        skeleton,
                        parsingType
                    );
                    chapter.content = content;
                    success = true
                } catch (e) {
                    tries++;
                }
            }

            if (!success) {
                throw new Error(ERRORS.FailedToScrape(skeleton.url));
            }

            tries = 0;
            success = false
            while (!success && tries < MAX_TRIES) {
                try {
                    let parsedItems = await parseChapter(
                        page,
                        chapter,
                        stagingPath,
                        parsingType,
                        scrapingOps,
                        imageOps
                    );
                    items.push(...parsedItems)
                    success = true
                } catch (e) {
                    tries++;
                }
            }

            if (!success) {
                throw new Error(ERRORS.FailedToParse(skeleton.url));
            }

            let id = uuidv4()
            await writeFile(join(stagingPath, "OEBPS", TEXT_DIR, `${id}.xhtml`), createChapterXHTML(chapter));

            await page.close()

            chapters.push({
                id,
                title: skeleton.title,
                index: skeleton.index,
                path: `${TEXT_DIR}/${id}.xhtml`,
                type: "application/xhtml+xml",
            });
        });

    chapters = chapters.sort((a, b) => a.index - b.index)

    return [chapters, items];
}

export async function downloadImagesLocally(
    page: PageWithCursor,
    pageURL: string,
    stagingPath: string,
    fileURLs: string[],
    scrapingOps: ScrapingOptions,
    imageOptions: ImageOptions,
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
                let path = join(
                    stagingPath,
                    "OEBPS",
                    IMAGE_DIR,
                    `${id}.${imageOptions.webp ? "webp" : "png"}`
                );
                try {
                    let buffer = await response.buffer();
                    let image = await processImage(sharp(buffer), imageOptions, imageOptions.webp);
                    await image.toFile(path);
                    filePaths[response.url()] = {
                        path: `${IMAGE_DIR}/${`${id}.${imageOptions.webp ? "webp" : "png"}`}`,
                        id,
                        type: EPUB_ITEM_TYPES.img(imageOptions.webp ? "webp" : "png"),
                    };
                    fileURLs = fileURLs.filter((r) => r != response.url());
                } catch (e) { }
            }
        });
    });

    while (!success && tries < MAX_TRIES) {
        try {
            page.goto(pageURL);
            success = await promise;
            tries++;
        } catch (e) { }
    }

    return filePaths;
}