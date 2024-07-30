import { Page } from "puppeteer";
import { ParserType } from "../cli.js";
import { Chapter } from "../json.js";
import { PuppeteerConnectionInfo } from "../scraper.js";
import { Scraper } from "./baseScraper.js";

export default class NoveloonScraper extends Scraper {
    page: Page;
    baseUrl: string;
    initialSetupComplete: boolean;
    timeout: number;

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
        await this.page.waitForSelector(`meta[property="og:novel:novel_name"]`);
        let title: string = await this.page.$eval(
            `meta[property="og:novel:novel_name"]`,
            (element) => element.content
        );

        return title;
    }

    async getAuthor(): Promise<string> {
        await this.page.waitForSelector(`meta[property="og:novel:author"]`);
        let author: string = await this.page.$eval(
            `meta[property="og:novel:author"]`,
            (element) => element.content
        );

        return author;
    }

    async getCoverImage(): Promise<string> {
        await this.page.waitForSelector(`meta[property="og:image"]`);
        let image: string = await this.page.$eval(
            `meta[property="og:image"]`,
            (element) => element.content
        );

        return image;
    }

    async getAllChapters(): Promise<Chapter[]> {
        let chapters: Chapter[] = [];

        while (true) {
            await this.page.waitForSelector(
                "main div div:nth-of-type(2) div ul li a"
            );

            let pageChapters: Chapter[] = await this.page.$$eval(
                "main div div:nth-of-type(2) div ul li a",
                (elements) => {
                    return elements.map((element) => {
                        return {
                            title: element.innerText,
                            url: element.href,
                            hasBeenScraped: false,
                            hasBeenParsed: false,
                            content: "",
                        };
                    });
                }
            );

            chapters = chapters.concat(pageChapters);

            let nextTOCPageURL = await this.page
                .$eval(
                    "main div div:nth-of-type(2) div div nav a:nth-child(3)",
                    (a) => a.href
                )
                .catch(() => "");
            if (nextTOCPageURL === "") break;

            await this.page.goto(nextTOCPageURL, {
                waitUntil: "domcontentloaded",
            });
        }

        return chapters;
    }

    async scrapeChapter(
        page: Page,
        chapter: Chapter,
        parserType: ParserType
    ): Promise<void> {
        return this.scrapePageHTML(
            page,
            chapter,
            "main div article",
            this.timeout,
            parserType
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, ["noveloon.com"]);
    }
}
