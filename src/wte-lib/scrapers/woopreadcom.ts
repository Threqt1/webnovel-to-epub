import { Scraper } from "./baseScraper.js";
import { type ChapterSkeleton, type ScrapingOptions } from "../structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export default class WoopreadComScraper extends Scraper {
    page!: PageWithCursor;
    initialSetupComplete!: boolean;
    scrapingOps!: ScrapingOptions;

    constructor() {
        super();
    }

    async initialize(
        url: string,
        connectionInfo: ConnectResult,
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
        await this.page.waitForSelector(`meta[property="og:title"]`);
        let title: string = await this.page.$eval(`meta[property="og:title"]`, (ele) =>
            ele.content
        );

        return title;
    }

    async getAuthor(): Promise<string> {
        await this.page.waitForSelector("main > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(4) > a");
        let author: string = await this.page.$eval(
            "main > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(4) > a",
            (element) => element.innerText.trim()
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
        await this.page.waitForSelector("main > div > div:nth-of-type(2) > button")

        await this.page.click("main > div > div:nth-of-type(2) > button", {
            delay: 500
        })
        await this.page.waitForFunction(`document.querySelector("main > div > div:nth-of-type(2) > button").disabled == false`)

        let chapters: ChapterSkeleton[] = await this.page.$$eval("main > div > div:nth-of-type(2) > div:nth-of-type(2) > a", (eles) => {
            return eles.map(a => {
                return {
                    title: (a.querySelector("div > div > h3") as HTMLHeadingElement).innerText.trim(),
                    url: a.href,
                    index: -1
                }
            })
        })
        chapters = chapters.reverse()

        for (let i = 0; i < chapters.length; i++) {
            chapters[i]!.index = i;
        }

        return chapters
    }

    async scrapeChapter(
        page: PageWithCursor,
        chapter: ChapterSkeleton
    ): Promise<string> {
        return this.scrapePageHTML(
            page,
            chapter,
            "main main > div > div:nth-of-type(1)",
            this.scrapingOps
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, [
            "woopread.com",
            "noveltranslationhub.com",
        ]);
    }
}
