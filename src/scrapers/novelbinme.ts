import { Scraper } from "./baseScraper.js";
import {
    type ChapterSkeleton,
    type ScrapingOptions,
} from "../wte-pkg/structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export default class NovelbinMeScraper extends Scraper {
    page!: PageWithCursor;
    url!: string;
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
        await this.page.goto(this.url, {
            waitUntil: "networkidle0",
            timeout: this.scrapingOps.timeout,
        });

        await this.page.waitForSelector("div.tab-content div.panel-body div.row ul.list-chapter a");

        let chapters: ChapterSkeleton[] = [];
        chapters = await this.page.$$eval("div.tab-content div.panel-body div.row ul.list-chapter a", (links) => {
            return links.map(link => {
                return {
                    title: link.getAttribute("title")!,
                    url: link.href,
                    index: -1
                }
            })
        })

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
            "div#chr-content",
            this.scrapingOps
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, [
            "novelbin.me",
        ]);
    }
}
