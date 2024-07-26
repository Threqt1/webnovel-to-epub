import { Page } from "puppeteer";
import { Scraper } from "./baseScraper.js";
import { PuppeteerConnectionInfo } from "../scraper.js";
import { Chapter } from "../json.js";
import { ParserOption } from "../cli.js";

export default class WoopreadScraper extends Scraper {
    page: Page;
    baseUrl: string;
    initialSetupComplete: boolean;
    timeout: number;

    constructor() {
        super();
    }

    async initialize(
        baseUrl: string,
        connectionInfo: PuppeteerConnectionInfo,
        timeout: number
    ): Promise<void> {
        this.page = connectionInfo.page;

        await this.page.goto(baseUrl, {
            waitUntil: "domcontentloaded",
            timeout: timeout,
        });

        this.timeout = timeout;
        this.baseUrl = baseUrl;
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
                    let localChapters = [];
                    for (let volume of volumes) {
                        let volumeChapters = [];
                        let links = volume.querySelectorAll("li a");
                        links.forEach((link: HTMLAnchorElement) => {
                            volumeChapters.push({
                                title: link.innerText.trim(),
                                url: link.href,
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
            chapters = chapters.reverse();
        }

        return chapters;
    }

    async scrapeChapter(
        page: Page,
        chapter: Chapter,
        parserType: ParserOption
    ): Promise<void> {
        return this.scrapePageHTML(
            page,
            chapter,
            "div.reading-content",
            this.timeout,
            parserType
        );
    }

    matchUrl(url: string): boolean {
        return this.baseMatchURL(url, [
            "woopread.com",
            "noveltranslationhub.com",
        ]);
    }
}
