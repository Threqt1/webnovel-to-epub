import { Scraper } from "./baseScraper.js";
import { type ChapterSkeleton, type ScrapingOptions } from "../structs.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";
import { EXCLUDE_TOC_PREFIX } from "../strings.js";

export default class AnyflipScraper extends Scraper {
    page!: PageWithCursor; // needed
    initialSetupComplete!: boolean; // needed
    scrapingOps!: ScrapingOptions; // needed
    bookConfig: string;

    constructor() {
        super();
        this.bookConfig = "";
    }

    /**
     * Method used instead of constructor
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
        let end = url.split("/").filter(r => r.trim().length > 0).slice(-2)
        this.url = "https://online.anyflip.com/" + end.join("/") //modify url if you need to navigate to some base page

        const response = await this.page.goto(this.url + "/mobile/javascript/config.js", {
            waitUntil: "networkidle0",
            timeout: scrapingOps.timeout
        })

        let configRaw = await response!.content()
        this.bookConfig = Buffer.from(configRaw).toString('utf-8');

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

        let titleRegex = /("?(bookConfig.)?bookTitle"?[=]"(.*?)")|"title":"(.*?)"/;
        let matches = this.bookConfig.match(titleRegex);
        if (!matches) return "";
        let match = matches[0];
        if (match.includes("=")) {
            return match.split("=")[1]!.trim().replace(/\"/g, "");
        } else if (match.includes(":")) {
            return match.split(":")[1]!.trim().replace(/\"/g, "");
        } else {
            return "";
        }
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

        return "Unknown"
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
        return "about:blank"
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
        let pageCountRegex = /"?(bookConfig\.)?(total)?[Pp]ageCount"?[=:]"?\d+"?/;
        let matches = this.bookConfig.match(pageCountRegex);
        if (!matches) return []
        let pageCount = 0;
        let match = matches[0]
        if (match.includes("=")) {
            pageCount = parseInt(match.split("=")[1]!.trim().replace(/\"/g, ""));
        } else if (match.includes(":")) {
            pageCount = parseInt(match.split(":")[1]!.trim().replace(/\"/g, ""));
        } else {
            return []
        }

        let explicitURLsRegex = /"n":\[".*?"\]/;
        matches = this.bookConfig.match(explicitURLsRegex)
        let chapterParts: ChapterSkeleton[] = []
        if (!matches) {
            for (let i = 1; i <= pageCount; i++) {
                chapterParts.push({
                    title: `${EXCLUDE_TOC_PREFIX} Page ${i}`,
                    url: this.url + "/files/mobile/" + `${i}.jpg`,
                    index: i
                })
            }
        } else {
            for (let i = 0; i < matches.length; i++) {
                match = matches[i]!.trim().replace(/\[|\]|\"/g, "")
                let url = match.split(":")[1]!.trim().replace(/\[|\]|\"/g, "")
                chapterParts.push({
                    title: `${EXCLUDE_TOC_PREFIX} Page ${i + 1}`,
                    url: this.url + "/files/large/" + url,
                    index: i
                })
            }
        }

        return chapterParts;
    }

    async scrapeChapter(
        page: PageWithCursor,
        chapter: ChapterSkeleton
    ): Promise<string> {
        /*
        Should return the content of a chapter passed into it. 

        If content is stored in a single div, helper method scrapePageHTML can be used to reduce boilerplate (check baseParser.ts for implementation)
        */
        return `
        <div>
        <img src="${chapter.url}" />
        </div>
        `
    }

    matchUrl(url: string): boolean {
        /*  
        Only thing to change is the second argument to baseMatchURL, an array of domains that should be considered "valid" for this parser
        */
        return this.baseMatchURL(url, ["anyflip.com"]);
    }

    customCSS(): string {
        return `
@charset "UTF-8";

/* Remove default reader/browser spacing */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

/* Prevent random gaps around the image */
body {
  background: white;
  overflow: hidden;
}

/* One full-page image container */
.page {
  margin: 0;
  padding: 0;

  width: 100%;
  height: 100%;

  text-align: center;
}

/* Main manga/comic page image */
.page img {
  display: block;

  margin: 0 auto;
  padding: 0;

  max-width: 100%;
  max-height: 100%;

  width: auto;
  height: auto;

  border: none;
}
        `;
    }
}
