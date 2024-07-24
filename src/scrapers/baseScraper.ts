import { PuppeteerConnectionInfo } from "../scraper.js";
import { Chapter } from "../json.js";
import { Page } from "puppeteer";
import { ParserOption } from "../cli.js";
import { htmlifyContent } from "../strings.js";

export abstract class Scraper {
    abstract initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo,
        timeout: number
    ): Promise<void>;
    abstract getTitle(): Promise<string>;
    abstract getAuthor(): Promise<string>;
    abstract getCoverImage(): Promise<string>;
    abstract getAllChapters(): Promise<Chapter[]>;
    abstract scrapeChapter(
        page: Page,
        chapter: Chapter,
        parserType: ParserOption
    ): Promise<void>;
    abstract matchUrl(url: string): boolean;

    protected async scrapePageHTML(
        page: Page,
        chapter: Chapter,
        contentSelector: string,
        timeout: number,
        parserType: ParserOption
    ) {
        await page.goto(chapter.url, {
            waitUntil: "domcontentloaded",
            timeout: timeout,
        });

        await page.waitForSelector(contentSelector);

        if (parserType === ParserOption.TextOnly) {
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

    protected baseMatchURL(url, urls: string[]): boolean {
        let parsed = new URL(url);

        return urls.includes(
            parsed.hostname.split(".").slice(-2).join(".").trim().toLowerCase()
        );
    }
}
