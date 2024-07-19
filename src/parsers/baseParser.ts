import { Page } from "puppeteer";
import { PuppeteerConnectionInfo } from "../scraper.js";
import { Chapter } from "../json.js";
import { MultiProgressBars } from "multi-progress-bars";

export abstract class Parser {
    abstract initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo,
        timeout: number
    ): Promise<void>;
    abstract getTitle(): Promise<string>;
    abstract getAuthor(): Promise<string>;
    abstract getCoverImage(): Promise<string>;
    abstract getAllChapters(pb: MultiProgressBars): Promise<Chapter[]>;
    abstract getChapterContent(page: Page, chapter: Chapter): Promise<string>;
    abstract matchUrl(url: string): boolean;
}
