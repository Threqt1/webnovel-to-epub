import { Page } from "puppeteer";
import { Parser } from "./baseParser.js";
import { PuppeteerConnectionInfo } from "../scraper.js";
import ProgressBar from "progress";
import chalk from "chalk";
import { ChapterInformation, ChapterWithContent } from "../json.js";

export default class WoopreadParser extends Parser {
    page: Page;
    baseUrl: string;
    initialSetupComplete: boolean;
    timeout: number;

    constructor() {
        super();
    }

    async initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo,
        timeout: number
    ): Promise<void> {
        this.page = connectionInfo.page;

        await this.page.goto(baseUrl, {
            waitUntil: "domcontentloaded",
            timeout: timeout,
        });

        this.timeout = timeout;
        this.initialSetupComplete = true;
    }

    async getTitle(): Promise<string> {
        if (!this.initialSetupComplete)
            return Promise.reject("Setup not completed");

        await this.page.waitForSelector("div.post-title");
        let title: string = await this.page.$eval("div.post-title", (div) =>
            div.innerText.trim()
        );

        return title;
    }

    async getAuthor(): Promise<string> {
        if (!this.initialSetupComplete)
            return Promise.reject("Setup not completed");

        await this.page.waitForSelector("div.author-content");
        let author: string = await this.page.$eval(
            "div.author-content",
            (element) => element.innerText.trim()
        );

        return author;
    }

    async getCoverImage(): Promise<string> {
        if (!this.initialSetupComplete)
            return Promise.reject("Setup not completed");

        await this.page.waitForSelector(`meta[property="og:image"]`);
        let image: string = await this.page.$eval(
            `meta[property="og:image"]`,
            (element) => element.content
        );

        return image;
    }

    async getAllChapterInfo(): Promise<ChapterInformation[]> {
        if (!this.initialSetupComplete)
            return Promise.reject("Setup not completed");

        await this.page.waitForSelector("div#manga-chapters-holder ul.main");
        let chapters: ChapterInformation[] = [];
        //check if there are volumes
        let isInVolumes = await this.page
            .$eval("ul.sub-chap-list", () => true)
            .catch(() => false);
        if (isInVolumes) {
            chapters = await this.page.$$eval(
                "div#manga-chapters-holder ul.sub-chap-list",
                (volumes) => {
                    let localChapters = [];
                    for (let volume of volumes) {
                        let volumeChapters = [];
                        let links = volume.querySelectorAll("li a");
                        links.forEach((link: HTMLAnchorElement) => {
                            volumeChapters.push({
                                title: link.innerText.trim(),
                                url: link.href,
                            });
                        });
                        localChapters = localChapters.concat(
                            volumeChapters.reverse()
                        );
                    }
                    return localChapters;
                }
            );
        } else {
            chapters = await this.page.$$eval(
                "div#manga-chapters-holder ul.main li a",
                (elements) => {
                    return elements.map((element) => {
                        return {
                            title: element.innerText.trim(),
                            url: element.href,
                        };
                    });
                }
            );
            chapters = chapters.reverse();
        }

        const bar = new ProgressBar(
            `${chalk.blue("[LOG]")} parsing table of contents ${chalk.green(
                "[:bar]"
            )} :current/:total ${chalk.dim(":percent")}`,
            {
                total: chapters.length,
                width: 50,
            }
        );

        bar.tick(chapters.length);

        return chapters;
    }

    async getChapterContent(
        page: Page,
        chapterInformation: ChapterInformation
    ): Promise<ChapterWithContent> {
        try {
            await page.goto(chapterInformation.url, {
                waitUntil: "domcontentloaded",
                timeout: this.timeout,
            });
        } catch (e) {}

        await page.waitForSelector("div.reading-content");
        let content = await page.$eval("div.reading-content", (element) =>
            element.innerText.trim()
        );

        return {
            title: chapterInformation.title,
            content,
        };
    }

    matchUrl(url: string): boolean {
        let parsed = new URL(url);

        return (
            parsed.hostname
                .split(".")
                .slice(-2)
                .join(".")
                .trim()
                .toLowerCase() === "woopread.com"
        );
    }
}
