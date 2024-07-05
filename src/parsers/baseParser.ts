import { Page } from "puppeteer";
import { PuppeteerConnectionInfo } from "../scraper.js";

export abstract class Parser {
    abstract initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo
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

export interface ChapterInformation {
    title: string;
    url: string;
}

export interface ChapterWithContent {
    title: string;
    content: string;
}
