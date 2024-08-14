import { Page } from "puppeteer-core";
import { Scraper } from "./baseScraper.js";
import {
    Chapter,
    ConnectionInfo,
    ParsingType,
    ScrapingOptions,
} from "../structs.js";

export default class NoveloonScraper extends Scraper {
    page: Page;
    url: string;
    initialSetupComplete: boolean;
    scrapingOps: ScrapingOptions;

    async initialize(
        url: string,
        connectionInfo: ConnectionInfo,
        scrapingOps: ScrapingOptions
    ): Promise<void> {
        this.page = connectionInfo.page;

        await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: scrapingOps.timeout,
        });

        this.url = url;
        this.scrapingOps = scrapingOps;
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
                            title: element.querySelector("h3").innerText,
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
        parsingType: ParsingType
    ): Promise<void> {
        return this.scrapePageHTML(
            page,
            chapter,
            "main div article",
            parsingType,
            this.scrapingOps
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, ["noveloon.com"]);
    }
}
