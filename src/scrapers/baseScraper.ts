import { Page } from "puppeteer-core";
import { htmlifyContent } from "../strings.js";
import {
    Chapter,
    ConnectionInfo,
    ParsingType,
    ScrapingOptions,
} from "../structs.js";

export abstract class Scraper {
    abstract initialize(
        baseUrl: string,
        connectionInfo: ConnectionInfo,
        scrapingOps: ScrapingOptions
    ): Promise<void>;
    abstract getTitle(): Promise<string>;
    abstract getAuthor(): Promise<string>;
    abstract getCoverImage(): Promise<string>;
    abstract getAllChapters(): Promise<Chapter[]>;
    abstract scrapeChapter(
        page: Page,
        chapter: Chapter,
        parsingType: ParsingType
    ): Promise<void>;
    abstract matchUrl(url: string): boolean;

    protected async scrapePageHTML(
        page: Page,
        chapter: Chapter,
        contentSelector: string,
        parsingType: ParsingType,
        scrapingOps: ScrapingOptions
    ) {
        await page.goto(chapter.url, {
            waitUntil: "domcontentloaded",
            timeout: scrapingOps.timeout,
        });

        await page.waitForSelector(contentSelector);

        if (parsingType === ParsingType.TextOnly) {
            let text = await page.$eval(contentSelector, (ele: any) =>
                ele.innerText.trim()
            );
            chapter.content = htmlifyContent(text) ?? "";
            chapter.hasBeenScraped = true;
            chapter.hasBeenParsed = true;
        } else {
            let html = await page.$eval(contentSelector, (ele) =>
                ele.innerHTML.trim()
            );
            chapter.content = html;
            chapter.hasBeenScraped = true;
        }
    }

    protected baseMatchURL(url: string, urls: string[]): boolean {
        let parsed = new URL(url);

        return urls.includes(
            parsed.hostname.split(".").slice(-2).join(".").trim().toLowerCase()
        );
    }
}
