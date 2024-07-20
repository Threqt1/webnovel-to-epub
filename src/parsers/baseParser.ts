import { createNewPage, PuppeteerConnectionInfo } from "../scraper.js";
import { Chapter } from "../json.js";
import { MultiProgressBars } from "multi-progress-bars";
import { writeFile } from "fs/promises";
import { getFilePathFromURL, htmlifyContent } from "../strings.js";
import * as cheerio from "cheerio";
import { Page } from "puppeteer";

const BANNED_TAGS = ["script", "video", "audio", "iframe", "input"];

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
    abstract getChapterContent(
        connectionInfo: PuppeteerConnectionInfo,
        page: Page,
        chapter: Chapter
    ): Promise<string>;
    abstract matchUrl(url: string): boolean;

    protected async baseParsePageContent(
        connectionInfo: PuppeteerConnectionInfo,
        page: Page,
        chapter: Chapter,
        contentSelector: string,
        timeout: number,
        textOnlyNoFormat = false
    ) {
        await page.goto(chapter.url, {
            waitUntil: "domcontentloaded",
            timeout: timeout,
        });

        await page.waitForSelector(contentSelector);

        if (textOnlyNoFormat) {
            let text = await page.$eval(
                contentSelector,
                (ele: any) => ele.innerText
            );

            return htmlifyContent(text.trim());
        }

        let html = await page.$eval(contentSelector, (e) => e.innerHTML);
        let $ = cheerio.load(`<div id="PARSER_BASE_DIV">${html}</div>`);
        $(BANNED_TAGS.join(", ")).each((_, ele) => {
            let $ele = $(ele);
            $ele.unwrap();
            $ele.remove();
        });

        let imageURLs = [];
        $("img").each((_, ele) => {
            let $ele = $(ele);
            imageURLs.push($ele.attr("src"));
        });

        if (imageURLs.length === 0) return $.html();

        let tempPage = await createNewPage(connectionInfo);

        let imagePaths: { [key: string]: string } = {};
        let responsesPromise = new Promise((resolve) => {
            let timeoutResolve = setTimeout(() => resolve(true), timeout);

            tempPage.on("response", async (response) => {
                if (imageURLs.length === 0) {
                    clearTimeout(timeoutResolve);
                    resolve(true);
                }
                if (imageURLs.includes(response.url())) {
                    let path = getFilePathFromURL(response.url());
                    try {
                        await writeFile(path, await response.buffer());
                        imagePaths[response.url()] = path;
                    } catch (e) {
                        console.log(e);
                    }
                    imageURLs = imageURLs.filter((r) => r != response.url());
                }
            });
        });

        tempPage.goto(chapter.url);

        await responsesPromise;

        $("img").each((_, ele) => {
            let $ele = $(ele);
            let path = imagePaths[$ele.attr("src")];
            if (!path) {
                $ele.unwrap();
                $ele.remove();
            } else {
                $ele.attr("src", `file://${path}`);
            }
        });

        await tempPage.close();

        return $.html();
    }
}
