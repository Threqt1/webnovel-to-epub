import { makeNewConnection } from "./wte-lib/connection.js";
import { clearStagingDirectory, createEpub, createStagingDirectory } from "./wte-lib/epub.js";
import {
    getNovelCoverImage,
    getNovelMetadata,
    getScraperForURL,
    processAndWriteChapters,
} from "./wte-lib/scraper.js";
import { TEMP_FILE_PATH } from "./wte-lib/strings.js";
import {
    ParsingType,
    type ChapterEpubItem,
    type EpubItem,
    type ImageOptions,
    type Metadata,
    type ScrapingOptions,
    type Webnovel,
} from "./wte-lib/structs.js";
import type { ConnectResult } from "puppeteer-real-browser";
import {
    makeScrapingOptionsSelectionPrompt,
    makeParsingOptionSelectionPrompt,
    makeImageOptionsPrompt,
    ScraperOption,
    makeScrapeSingleSelectionPrompt,
    makeScrapeMultipleSelectionPrompt,
    makeWriteEpubSelectionPrompt,
} from "./cli.js";
import slugify from "slugify";
import { join } from "path";

/**
 * TODO:
 * add logging capabilities
 * add the thing to update current epub
 * create README.md
 * test manga functionality (test sharp)
 */

let CONNECTION_INFO: ConnectResult;

async function main() {
    let scrapingOption = await makeScrapingOptionsSelectionPrompt();
    let parsingType = await makeParsingOptionSelectionPrompt();
    let imageOptions = await makeImageOptionsPrompt();
    let saveOptions = await makeWriteEpubSelectionPrompt();

    CONNECTION_INFO = await makeNewConnection();

    let webnovel: Webnovel | null;
    switch (scrapingOption) {
        case ScraperOption.ScrapeSingle:
            webnovel = await handleScrapeSingle(imageOptions, parsingType);
            break;
        case ScraperOption.ScrapeMultiple:
            webnovel = await handleScrapeMultiple(imageOptions, parsingType);
            break;
    }

    await handleWriteEpub(webnovel, saveOptions.savePath);

    await CONNECTION_INFO.browser.close()

    await clearStagingDirectory(TEMP_FILE_PATH)

    return
}

async function handleScrapeSingle(
    imageOptions: ImageOptions,
    parsingType: ParsingType
) {
    let options = await makeScrapeSingleSelectionPrompt();
    let scraperOptions: ScrapingOptions = {
        concurrency: options.concurrencyPages,
        timeout: options.timeout,
    };

    await createStagingDirectory(TEMP_FILE_PATH);

    let scraper = await getScraperForURL(
        options.url,
        CONNECTION_INFO,
        scraperOptions
    );
    let metadata = await getNovelMetadata(scraper);
    let coverImage = await getNovelCoverImage(
        scraper,
        CONNECTION_INFO,
        TEMP_FILE_PATH,
        scraperOptions,
        imageOptions
    );
    metadata.coverImage = coverImage;
    let chapters = await scraper.getAllChapters();
    let [chapterItems, allItems] = await processAndWriteChapters(
        CONNECTION_INFO,
        scraper,
        TEMP_FILE_PATH,
        chapters,
        scraperOptions,
        imageOptions,
        parsingType
    );

    return {
        metadata,
        chapters: chapterItems.sort((a, b) => a.index - b.index),
        items: allItems,
    };
}

async function handleScrapeMultiple(
    imageOptions: ImageOptions,
    parsingType: ParsingType
) {
    let options = await makeScrapeMultipleSelectionPrompt();
    let scraperOptions: ScrapingOptions = {
        concurrency: options.concurrencyPages,
        timeout: options.timeout,
    };

    await createStagingDirectory(TEMP_FILE_PATH);

    let metadata: Metadata = {
        title: "",
        author: "",
        id: "",
    };
    let chapters: ChapterEpubItem[] = [];
    let items: EpubItem[] = [];
    let indexIncrement = 0;

    for (let i = 0; i < options.webnovelURLs.length; i++) {
        let url = options.webnovelURLs[i]!;

        let scraper = await getScraperForURL(
            url,
            CONNECTION_INFO,
            scraperOptions
        );

        if (i == options.indexToKeepData) {
            metadata = await getNovelMetadata(scraper);
            let coverImage = await getNovelCoverImage(
                scraper,
                CONNECTION_INFO,
                TEMP_FILE_PATH,
                scraperOptions,
                imageOptions
            );
            metadata.coverImage = coverImage;
        }

        let chapters = await scraper.getAllChapters();
        let [chapterItems, allItems] = await processAndWriteChapters(
            CONNECTION_INFO,
            scraper,
            TEMP_FILE_PATH,
            chapters,
            scraperOptions,
            imageOptions,
            parsingType
        );

        chapters.push(
            ...chapterItems
                .sort((a, b) => a.index - b.index)
                .map((r) => {
                    return { ...r, index: (r.index += indexIncrement) };
                })
        );

        items.push(...allItems);

        indexIncrement += chapterItems.length;
    }

    return {
        metadata,
        chapters,
        items,
    };
}

async function handleWriteEpub(webnovel: Webnovel, savePath: string) {
    await createEpub(
        webnovel,
        TEMP_FILE_PATH,
        join(
            savePath,
            `${slugify.default(webnovel.metadata.title, " ")}.epub`
        )
    );
}

main();

// async function test() {
//     // let stagingPath = TEMP_FILE_PATH;
//     // await createStagingDirectory(stagingPath);

//     let scrapingOps = { concurrency: 3, timeout: 3000 };
//     let imageOps = {
//         quality: 80,
//         shouldResize: false,
//         maxHeight: 0,
//         maxWidth: 0,
//         webp: false,
//     };
//     let conn = await makeNewConnection();
//     let scraper = await getScraperForURL(
//         "https://novelbin.me/novel-book/rakuin-no-monshou",
//         conn,
//         scrapingOps
//     );
//     // let metadata = await getNovelMetadata(scraper);
//     // let chapterList = await getChapterList(scraper);
//     // let coverImage = await getNovelCoverImage(
//     //     scraper,
//     //     conn,
//     //     stagingPath,
//     //     scrapingOps,
//     //     imageOps
//     // );
//     // let [chapterItems, otherItems] = await processAndWriteChapters(
//     //     conn,
//     //     scraper,
//     //     stagingPath,
//     //     chapterList,
//     //     scrapingOps,
//     //     imageOps,
//     //     ParsingType.WithImage
//     // );

//     // let items = otherItems.concat(chapterItems);
//     // metadata.coverImage = coverImage;
//     // await createEpub(
//     //     metadata,
//     //     chapterItems,
//     //     items,
//     //     stagingPath,
//     //     `${slugify.default(metadata.title, " ")}.epub`
//     // );

//     // await conn.browser.close();

//     // await clearStagingDirectory(stagingPath);

//     let chapterList = await scraper.getAllChapters();

//     let novel = await unzipAndParseEpub(
//         "Rakuin no Monshou.epub",
//         TEMP_FILE_PATH
//     );

//     let not_added_chapters = chapterList.filter(
//         (r) => !novel.chapters.find((t) => t.url == r.url)
//     );

//     let [newChapters, newItems] = await processAndWriteChapters(
//         conn,
//         scraper,
//         TEMP_FILE_PATH,
//         not_added_chapters,
//         scrapingOps,
//         imageOps,
//         ParsingType.WithImage
//     );

//     await createEpub(
//         novel.metadata,
//         [...novel.chapters, ...newChapters].sort((a, b) => a.index - b.index),
//         [...novel.items, ...newItems, ...newChapters],
//         TEMP_FILE_PATH,
//         "testing.epub"
//     );

//     await conn.browser.close();

//     return;
// }

// test();
