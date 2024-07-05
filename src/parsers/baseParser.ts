import { Page } from "puppeteer";
import { PuppeteerConnectionInfo } from "../scraper.js";
import { ChapterInformation, ChapterWithContent } from "../json.js";

export abstract class Parser {
    abstract initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo,
        timeout: number
    ): Promise<void>;
    abstract getTitle(): Promise<string>;
    abstract getAuthor(): Promise<string>;
    abstract getCoverImage(): Promise<string>;
    abstract getAllChapterInfo(): Promise<ChapterInformation[]>;
    abstract getChapterContent(
        page: Page,
        chapterInformation: ChapterInformation
    ): Promise<ChapterWithContent>;
    abstract matchUrl(url: string): boolean;
}
