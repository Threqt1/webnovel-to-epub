import { Page } from "puppeteer";
import { Parser } from "./baseParser.js";
import { createNewPage, PuppeteerConnectionInfo } from "../scraper.js";
import chalk from "chalk";
import { Chapter } from "../json.js";
import { MultiProgressBars } from "multi-progress-bars";
import { DefaultProgressBarCustomization } from "../logger.js";
import * as cheerio from "cheerio";
import { getFilePathFromURL } from "../strings.js";
import { writeFile } from "fs/promises";

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
        this.baseUrl = baseUrl;
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

    async getAllChapters(pb: MultiProgressBars): Promise<Chapter[]> {
        if (!this.initialSetupComplete)
            return Promise.reject("Setup not completed");

        pb.addTask(`Parsing Table of Contents ${this.baseUrl}`, {
            ...DefaultProgressBarCustomization,
            nameTransformFn: () =>
                `Parsing Table of Contents (${chalk.dim(this.baseUrl)})`,
        });

        await this.page.waitForSelector("div#manga-chapters-holder ul.main");
        let chapters: Chapter[] = [];
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
                            isContentFilled: false,
                            content: "",
                        };
                    });
                }
            );
            chapters = chapters.reverse();
        }

        pb.done(`Parsing Table of Contents ${this.baseUrl}`, {
            nameTransformFn: () =>
                `Parsing Table of Contents (${chapters.length}/${
                    chapters.length
                }) (${chalk.dim(this.baseUrl)})`,
        });

        return chapters;
    }

    async getChapterContent(
        connectionInfo: PuppeteerConnectionInfo,
        page: Page,
        chapter: Chapter
    ): Promise<string> {
        return this.baseParsePageContent(
            connectionInfo,
            page,
            chapter,
            "div.reading-content",
            this.timeout
        );
    }

    matchUrl(url: string): boolean {
        let parsed = new URL(url);
        let urls = ["woopread.com", "noveltranslationhub.com"];

        return urls.includes(
            parsed.hostname.split(".").slice(-2).join(".").trim().toLowerCase()
        );
    }
}
