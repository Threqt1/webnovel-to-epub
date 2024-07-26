import { Browser, Page } from "puppeteer";
import { PromisePool } from "@supercharge/promise-pool";
import { writeFile } from "fs/promises";
import { getFilePathFromURL } from "./strings.js";
import { Webnovel } from "./json.js";
import chalk from "chalk";
import { MultiProgressBars } from "multi-progress-bars";
import {
    DefaultProgressBarCustomization,
    printError,
    printLog,
} from "./logger.js";
import { ParserOption } from "./cli.js";
import { findCorrectScraper } from "./scrapers/scaperBucket.js";
import sharp from "sharp";

const MAX_TRIES = 3;

export type PuppeteerConnectionInfo = {
    page: Page;
    browser: Browser;
    setTarget: (value: { status: boolean }) => void;
};

export async function makeNewConnection(
    executablePath?: string
): Promise<PuppeteerConnectionInfo> {
    const { connect } = await import("@threqt1/puppeteer-real-browser");
    console.log(`${chalk.blue("[LOG]")} starting puppeteer connection`);
    const connectionInfo: PuppeteerConnectionInfo = await connect({
        headless: "auto",
        turnstile: true,
        fingerprint: false,
        customConfig: {
            executablePath,
        },
    });
    await setupPage(connectionInfo.page);
    return connectionInfo;
}

export async function createNewPage(
    connectionInfo: PuppeteerConnectionInfo,
    allowImg: boolean = true
): Promise<Page> {
    connectionInfo.setTarget({ status: false });
    let newPage = await connectionInfo.browser.newPage();
    await setupPage(newPage, allowImg);
    connectionInfo.setTarget({ status: true });
    return newPage;
}

async function setupPage(page: Page, allowImg: boolean = true): Promise<void> {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
        if (
            req.resourceType() === "stylesheet" ||
            req.resourceType() === "font" ||
            (!allowImg && req.resourceType() === "media")
        ) {
            req.abort();
        } else {
            req.continue();
        }
    });
}

export async function downloadImagesLocally(
    page: Page,
    pageURL: string,
    fileURLs: string[],
    timeout: number,
    quality: number
): Promise<{ [key: string]: string }> {
    let tries = 0;
    let success = false;
    let filePaths: { [key: string]: string } = {};

    while (!success && tries < MAX_TRIES) {
        try {
            let promise: Promise<boolean> = new Promise((resolve) => {
                let timeoutResolve = setTimeout(() => resolve(true), timeout);

                page.on("response", async (response) => {
                    if (fileURLs.length === 0) {
                        clearTimeout(timeoutResolve);
                        resolve(true);
                    }
                    if (fileURLs.includes(response.url())) {
                        let path = getFilePathFromURL(response.url());
                        try {
                            let buffer = await response.buffer();
                            await sharp(buffer)
                                .webp({ lossless: true, quality })
                                .toFile(path);
                            filePaths[response.url()] = path;
                        } catch (e) {
                            console.log(e);
                        }
                        fileURLs = fileURLs.filter((r) => r != response.url());
                    }
                });
            });

            page.goto(pageURL);
            success = await promise;
            tries++;
        } catch (e) {}
    }

    return filePaths;
}

export async function scrapeWebnovel(
    url: string,
    connectionInfo: PuppeteerConnectionInfo,
    parserType: ParserOption,
    concurrency: number,
    timeout: number,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let parser = findCorrectScraper(url);
    if (!parser)
        printError(`parser not implemented for the url: ${chalk.dim(url)}`);

    pb.addTask(`Starting Connection ${url}`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => {
            return `Starting Connection (${chalk.dim(url)})`;
        },
    });

    await parser.initialize(url, connectionInfo, timeout);

    pb.done(`Starting Connection ${url}`);
    pb.addTask(`Getting Metadata ${url}`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => {
            return `Getting Metadata (${chalk.dim(url)})`;
        },
    });

    let title = await parser.getTitle();
    let author = await parser.getAuthor();
    let coverImageURL = await parser.getCoverImage();

    pb.done(`Getting Metadata ${url}`);
    printLog(`title: ${title}`);
    printLog(`author: ${author}`);

    pb.addTask(`Parsing Table of Contents ${url}`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => `Parsing Table of Contents (${chalk.dim(url)})`,
    });

    let chapters = await parser.getAllChapters();

    pb.done(`Parsing Table of Contents ${url}`, {
        nameTransformFn: () =>
            `Parsing Table of Contents (${chapters.length}/${
                chapters.length
            }) (${chalk.dim(url)})`,
    });

    let pages: Page[] = [];
    for (let i = 0; i < concurrency; i++) {
        let newPage = await createNewPage(connectionInfo, false);
        pages.push(newPage);
    }

    pb.addTask(`Scraping Chapters ${url}`, {
        ...DefaultProgressBarCustomization,
        type: "percentage",
        nameTransformFn: () => `Scraping Chapters (${chalk.dim(url)})`,
        message: `0/${chapters.length}`,
    });

    let incrementPerChapter = 1 / chapters.length;
    let finished = 0;

    await PromisePool.withConcurrency(concurrency)
        .for(chapters)
        .onTaskFinished(() => {
            finished++;
            pb.incrementTask(`Scraping Chapters ${url}`, {
                percentage: incrementPerChapter,
                message: `${finished}/${chapters.length}`,
            });
        })
        .process(async (chapter) => {
            if (chapter.hasBeenScraped) return chapter;
            let page = pages.pop();
            let tries = 0;
            while (!chapter.hasBeenScraped && tries < MAX_TRIES) {
                try {
                    await parser.scrapeChapter(page, chapter, parserType);
                } catch (e) {
                    tries++;
                }
            }

            pages.push(page);

            return true;
        });

    pb.done(`Scraping Chapters ${url}`);

    for (let page of pages) {
        await page.close();
    }

    return {
        title,
        author,
        coverImageURL,
        chapters,
    };
}
