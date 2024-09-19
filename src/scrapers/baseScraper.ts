import {
    type Chapter,
    type ChapterSkeleton,
    ParsingType,
    type ScrapingOptions,
} from "../wte-pkg/structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export abstract class Scraper {
    abstract initialize(
        baseUrl: string,
        connection: ConnectResult,
        scrapingOps: ScrapingOptions
    ): Promise<void>;
    abstract getTitle(): Promise<string>;
    abstract getAuthor(): Promise<string>;
    abstract getCoverImage(): Promise<string>;
    abstract getAllChapters(): Promise<ChapterSkeleton[]>;
    abstract scrapeChapter(
        page: PageWithCursor,
        chapter: ChapterSkeleton,
        parsingType: ParsingType
    ): Promise<string>;
    abstract matchUrl(url: string): boolean;

    protected async scrapePageHTML(
        page: PageWithCursor,
        chapter: ChapterSkeleton,
        contentSelector: string,
        scrapingOps: ScrapingOptions
    ): Promise<string> {
        await page.goto(chapter.url, {
            waitUntil: "domcontentloaded",
            timeout: scrapingOps.timeout,
        });

        await page.waitForSelector(contentSelector);

        let html = await page.$eval(contentSelector, (ele) => ele.innerHTML);

        return html;
    }

    protected baseMatchURL(url: string, urls: string[]): boolean {
        let parsed = new URL(url);

        return urls.includes(
            parsed.hostname.split(".").slice(-2).join(".").trim().toLowerCase()
        );
    }
}
