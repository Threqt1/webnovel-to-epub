import { Scraper } from "./baseScraper.js";
import { type ChapterSkeleton, type ScrapingOptions } from "../structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

/**
 * After done, instantiate this scraper in the array in scraperBucket.ts
 */
export default class ExampleScraper extends Scraper {
    page!: PageWithCursor; // needed
    initialSetupComplete!: boolean; // needed
    scrapingOps!: ScrapingOptions; // needed

    constructor() {
        super();
    }

    /**
     * Method used instead of constructor - DONT MESS WITH IT
     * @param url URL that the scraper will handle
     * @param connectionInfo Wrapper for puppeteer info
     * @param scrapingOps Scraping options
     */
    async initialize(
        url: string,
        connectionInfo: ConnectResult,
        scrapingOps: ScrapingOptions
    ): Promise<void> {
        this.page = connectionInfo.page;
        this.url = url + "#tab-chapters-title";

        await this.page.goto(this.url, {
            waitUntil: "networkidle0",
            timeout: scrapingOps.timeout,
        });

        this.scrapingOps = scrapingOps;
        this.initialSetupComplete = true;
    }

    /**
     * @returns Should return title of the webnovel
     */
    async getTitle(): Promise<string> {
        // You can access the puppeteer page instance using this.page

        /*
        Example here if title was in a meta tag:

        await this.page.waitForSelector(`meta[property="og:novel:novel_name"]`);
        let title: string = await this.page.$eval(
            `meta[property="og:novel:novel_name"]`,
            (element) => element.content
        );

        return title
        */

        return "";
    }

    /**
     * @returns Same thing as title but for the author
     */
    async getAuthor(): Promise<string> {
        /*
        Example if author was in a meta tag
        await this.page.waitForSelector(`meta[property="og:novel:author"]`);
        let author: string = await this.page.$eval(
            `meta[property="og:novel:author"]`,
            (element) => element.content
        );

        return author;
        */

        return ""
    }

    /**
     * @returns Should return the URL for the cover image
     */
    async getCoverImage(): Promise<string> {
        /*
        Example if the URL was in a meta tag
        await this.page.waitForSelector(`meta[property="og:image"]`);
        let image: string = await this.page.$eval(
            `meta[property="og:image"]`,
            (element) => element.content
        );

        return image;
        */
        return ""
    }

    async getAllChapters(): Promise<ChapterSkeleton[]> {
        /*
        Should return an array containing multiple ChapterSkeleton objects, one for each chapter, which looks something like this:
        {
            title: "title string",
            url: "url of the chapter",
            index: the position of the chapter (0 is first, 100 is last, etc)
        }

        Puppeteer page is avaliable for use. For "normal" chapters, example is in the novelbinme.ts parser. For one where you need to utilize
        puppeteer to move through multiple table of content pages, novelooncom.ts has an example.
        */

        return []
    }

    async scrapeChapter(
        page: PageWithCursor,
        chapter: ChapterSkeleton
    ): Promise<string> {
        /*
        Should return the content of a chapter passed into it. 

        If content is stored in a single div, helper method scrapePageHTML can be used to reduce boilerplate (check baseParser.ts for implementation)
        */
        return this.scrapePageHTML(
            page,
            chapter,
            "div",
            this.scrapingOps
        );
    }

    matchUrl(url: string): boolean {
        /*  
        Only thing to change is the second argument to baseMatchURL, an array of domains that should be considered "valid" for this parser
        */
        return this.baseMatchURL(url, ["novelbin.me"]);
    }
}
