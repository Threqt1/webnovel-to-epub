import { Page } from "puppeteer-core";
import { Scraper } from "./baseScraper.js";
import {
    Chapter,
    ConnectionInfo,
    ParsingType,
    ScrapingOptions,
} from "../structs.js";

export default class WoopreadScraper extends Scraper {
    page: Page;
    url: string;
    initialSetupComplete: boolean;
    scrapingOps: ScrapingOptions;

    constructor() {
        super();
    }

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
        await this.page.waitForSelector("div.post-title");
        let title: string = await this.page.$eval("div.post-title", (div) =>
            div.innerText.trim()
        );

        return title;
    }

    async getAuthor(): Promise<string> {
        await this.page.waitForSelector("div.author-content");
        let author: string = await this.page.$eval(
            "div.author-content",
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

    async getAllChapters(): Promise<Chapter[]> {
        await this.page.waitForSelector("div#manga-chapters-holder ul.main");

        let chapters: Chapter[] = [];
        //check if there are volumes
        let isInVolumes = await this.page
            .$eval("ul.sub-chap-list", () => true)
            .catch(() => false);
        if (isInVolumes) {
            chapters = await this.page.$$eval(
                "div#manga-chapters-holder ul.sub-chap-list",
                (volumes) => {
                    let localChapters: Chapter[] = [];
                    for (let volume of volumes) {
                        let volumeChapters: Chapter[] = [];
                        let links = volume.querySelectorAll("li a");
                        links.forEach((link: HTMLAnchorElement) => {
                            volumeChapters.push({
                                title: link.innerText.trim(),
                                url: link.href,
                                hasBeenParsed: false,
                                hasBeenScraped: false,
                                content: "",
                            });
                        });
                        localChapters = localChapters.concat(
                            volumeChapters.reverse()
                        );
                    }
                    return localChapters;
                }
            );
        } else {
            chapters = await this.page.$$eval(
                "div#manga-chapters-holder ul.main li a",
                (elements) => {
                    return elements.map((element) => {
                        return {
                            title: element.innerText.trim(),
                            url: element.href,
                            hasBeenParsed: false,
                            hasBeenScraped: false,
                            content: "",
                        };
                    });
                }
            );
            chapters = chapters.reverse().slice(0, 3);
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
            "div.reading-content",
            parsingType,
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
