import { Browser, Page } from "puppeteer";
import { PromisePool } from "@supercharge/promise-pool";
import { writeFile } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "./strings.js";
import { ChapterWithContent, SerializableWebnovel } from "./json.js";
import { findCorrectParser } from "./parser.js";
import ProgressBar from "progress";
import chalk from "chalk";

const MAX_TRIES = 3;

export type PuppeteerConnectionInfo = {
    page: Page;
    browser: Browser;
    setTarget: (value: { status: boolean }) => void;
};

export async function makeNewConnection(
    executablePath?: string
): Promise<PuppeteerConnectionInfo> {
    const { connect } = await import("puppeteer-real-browser");
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

export async function setupPage(
    page: Page,
    allowImg: boolean = true
): Promise<void> {
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
    connectionInfo: PuppeteerConnectionInfo,
    url: string,
    path?: string
): Promise<string> {
    let page = await createNewPage(connectionInfo);

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
            const source = await page.goto(url);
            await writeFile(filePath, await source.buffer());
            success = true;
        } catch (e) {
            tries++;
        }
    }

    return filePath;
}

export async function scrapeWebnovel(
    url: string,
    connectionInfo: PuppeteerConnectionInfo,
    concurrency: number,
    timeout: number
): Promise<SerializableWebnovel> {
    let parser = findCorrectParser(url);
    if (!parser)
        throw new Error(
            `${chalk.red(
                "[ERROR]"
            )} parser not implemented for the url: ${chalk.dim(url)}`
        );

    console.log(`${chalk.blue("[LOG]")} beginning to parse ${chalk.dim(url)}`);
    await parser.initialize(url, connectionInfo, timeout);

    let title = await parser.getTitle();
    let author = await parser.getAuthor();
    let coverImageLink = await parser.getCoverImage();

    console.log(
        `${chalk.blue("[LOG]")} parsed details\n${chalk.gray(
            "title"
        )}: ${title}\n${chalk.gray("author")}: ${author}`
    );

    console.log(`${chalk.blue("[LOG]")} starting to parse chapters`);
    let chapterInformations = await parser.getAllChapterInfo();

    let pages = [];
    for (let i = 0; i < concurrency; i++) {
        let newPage = await createNewPage(connectionInfo, false);
        pages.push(newPage);
    }

    const bar = new ProgressBar(
        `${chalk.blue("[LOG]")} scraping chapters ${chalk.green(
            "[:bar]"
        )} :current/:total ${chalk.dim("(:rate chap/s)")} :percent ${chalk.dim(
            "(:etas)"
        )}`,
        {
            total: chapterInformations.length,
            width: 50,
        }
    );

    const { results } = await PromisePool.withConcurrency(concurrency)
        .for(chapterInformations)
        .onTaskFinished(() => {
            bar.tick();
        })
        .process(async (chapterInformation) => {
            let page = pages.pop();
            let chapter: ChapterWithContent;
            let tries = 0;
            while (!chapter && tries < MAX_TRIES) {
                try {
                    chapter = await parser.getChapterContent(
                        page,
                        chapterInformation
                    );
                } catch (e) {
                    console.log(e, chapterInformation.url);
                    tries++;
                }
            }

            pages.push(page);

            return chapter;
        });

    let chaptersWithContent = results;

    return {
        title,
        author,
        coverImageURL: coverImageLink,
        chapters: chaptersWithContent,
    };
}
