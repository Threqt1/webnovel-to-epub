import { Browser, Page } from "puppeteer";
import { PromisePool } from "@supercharge/promise-pool";
import { writeFile } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "./strings.js";
import { Webnovel } from "./json.js";
import { findCorrectParser } from "./parser.js";
import chalk from "chalk";
import { MultiProgressBars } from "multi-progress-bars";
import {
    DefaultProgressBarCustomization,
    printError,
    printLog,
} from "./logger.js";

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

export async function downloadImageLocally(
    page: Page,
    url: string,
    timeoutNumber: number,
    path?: string
): Promise<string> {
    let fileNameSplit = url.split("/").at(-1).split(".");
    let fileName = fileNameSplit[0];
    let fileExtension = fileNameSplit[1];
    let filePath = join(
        path || __dirname,
        `${sanitizeFilename(fileName)}.${fileExtension}`
    );

    let tries = 0;
    let success = false;
    while (!success && tries < MAX_TRIES) {
        try {
            let promise = new Promise(async (resolve, reject) => {
                let timeout = setTimeout(() => reject(false), timeoutNumber);
                page.on("response", async (response) => {
                    if (
                        response.url() === url &&
                        response.headers()["content-type"].includes("image")
                    ) {
                        await writeFile(filePath, await response.buffer());
                        clearTimeout(timeout);
                        resolve(true);
                    }
                });
            });
            await page.goto(url, {
                waitUntil: "networkidle0",
            });
            let result = await promise;
            if (!result) throw new Error();
            success = true;
        } catch (e) {
            tries++;
        }
    }

    if (!success) {
        printLog("failed to download cover image, defaulting to none");
        return "";
    }

    return filePath;
}

export async function scrapeWebnovel(
    url: string,
    connectionInfo: PuppeteerConnectionInfo,
    concurrency: number,
    timeout: number,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let parser = findCorrectParser(url);
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
    let coverImageLink = await parser.getCoverImage();

    pb.done(`Getting Metadata ${url}`);
    printLog(`title: ${title}`);
    printLog(`author: ${author}`);

    let chapters = await parser.getAllChapters(pb);

    let pages = [];
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
            if (chapter.isContentFilled) return chapter;
            let page = pages.pop();
            let tries = 0;
            while (!chapter.isContentFilled && tries < MAX_TRIES) {
                try {
                    chapter.content = await parser.getChapterContent(
                        page,
                        chapter
                    );
                    chapter.isContentFilled = true;
                } catch (e) {
                    console.log(e, chapter.url);
                    tries++;
                }
            }

            pages.push(page);

            return true;
        });

    pb.done(`Scraping Chapters ${url}`);

    return {
        title,
        author,
        coverImageURL: coverImageLink,
        chapters,
    };
}
