import { Scraper } from "./baseScraper.js";
import { type ChapterSkeleton, type ScrapingOptions } from "../structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export default class NoveloonComScraper extends Scraper {
    page!: PageWithCursor;
    url!: string;
    initialSetupComplete!: boolean;
    scrapingOps!: ScrapingOptions;

    async initialize(
        url: string,
        connection: ConnectResult,
        scrapingOps: ScrapingOptions
    ): Promise<void> {
        this.page = connection.page;

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

    async getAllChapters(): Promise<ChapterSkeleton[]> {
        let chapters: ChapterSkeleton[] = [];

        while (true) {
            await this.page.waitForSelector(
                "main div div:nth-of-type(2) div ul li a"
            );

            let pageChapters: ChapterSkeleton[] = await this.page.$$eval(
                "main div div:nth-of-type(2) div ul li a",
                (elements) => {
                    return elements.map((element, i: number) => {
                        return {
                            title: element.querySelector("h3")?.innerText || "",
                            url: element.href,
                            index: -1,
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

        for (let i = 0; i < chapters.length; i++) {
            chapters[i]!.index = i;
        }

        return chapters;
    }

    async scrapeChapter(
        page: PageWithCursor,
        chapter: ChapterSkeleton
    ): Promise<string> {
        return this.scrapePageHTML(
            page,
            chapter,
            "main div article",
            this.scrapingOps
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, ["noveloon.com"]);
    }
}
