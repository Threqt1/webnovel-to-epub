import { Scraper } from "./baseScraper.js";
import { type ChapterSkeleton, type ScrapingOptions } from "../structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export default class WoopreadComScraper extends Scraper {
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

    async getAllChapters(): Promise<ChapterSkeleton[]> {
        await this.page.waitForSelector("div#manga-chapters-holder ul.main");

        let chapters: ChapterSkeleton[] = [];
        //check if there are volumes
        let isInVolumes = await this.page
            .$eval("ul.sub-chap-list", () => true)
            .catch(() => false);
        if (isInVolumes) {
            chapters = await this.page.$$eval(
                "div#manga-chapters-holder ul.sub-chap-list",
                (volumes) => {
                    let localChapters: ChapterSkeleton[] = [];
                    for (let volume of volumes) {
                        let volumeChapters: ChapterSkeleton[] = [];
                        let links = volume.querySelectorAll("li a");
                        links.forEach((ele: Element) => {
                            let link = ele as HTMLAnchorElement;
                            volumeChapters.push({
                                title: link.innerText.trim(),
                                url: link.href,
                                index: -1,
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
                            index: -1,
                        };
                    });
                }
            );
            chapters = chapters.reverse();
        }

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
            "div.reading-content",
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
