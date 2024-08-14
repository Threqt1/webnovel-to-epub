import { mkdir, rm } from "fs/promises";
import {
    DefaultProgressBarCustomization,
    printError,
    printLog,
} from "./logger.js";
import { TEMP_FILE_PATH } from "./strings.js";
import {
    ExportOption,
    makeExportOptionsSelectionPrompt,
    makeImageOptionsPrompt,
    makeJSONMultipleSelectionPrompt,
    makeJSONSingleSelectionPrompt,
    makeParsingOptionSelectionPrompt,
    makeScrapeMultipleSelectionPrompt,
    makeScrapeSingleSelectionPrompt,
    makeScrapingOptionsSelectionPrompt,
    makeWriteEpubSelectionPrompt,
    makeWriteJSONSelectionPrompt,
    ParserOptions,
    ScraperOption,
} from "./cli.js";
import { MultiProgressBars } from "multi-progress-bars";
import { ImageOptions, ParsingType, Webnovel } from "./structs.js";
import { makeNewConnection, scrapeWebnovel } from "./scraper.js";
import {
    combineWebnovels,
    readWebnovelFromJSON,
    writeWebnovelToJSON,
} from "./json.js";
import { parseWebnovel } from "./parser.js";
import { writeWebnovelToEpub } from "./epub.js";

function createProgressBars() {
    return new MultiProgressBars({
        initMessage: "Webnovel To Epub CLI",
        anchor: "top",
        persist: true,
        border: true,
    });
}

async function main() {
    try {
        printLog("making temp dir");
        await mkdir(TEMP_FILE_PATH);
    } catch (e) {
        console.log(e);
    }

    let scrapingOption = await makeScrapingOptionsSelectionPrompt();
    let parsingOptions = await makeParsingOptionSelectionPrompt();
    let imageOptions = await makeImageOptionsPrompt();

    let pb = createProgressBars();

    let webnovel: Webnovel | null;
    switch (scrapingOption) {
        case ScraperOption.ScrapeSingle:
            webnovel = await handleScrapeSingle(parsingOptions.parsingType, pb);
            break;
        case ScraperOption.ScrapeMultiple:
            webnovel = await handleScrapeMultiple(
                parsingOptions.parsingType,
                pb
            );
            break;
        case ScraperOption.JSONSingle:
            webnovel = await handleJSONSingle(pb);
            break;
        case ScraperOption.JSONMultiple:
            webnovel = await handleJSONMultiple(pb);
            break;
    }

    if (!webnovel) {
        printError("failed to obtain webnovel");
        return;
    }

    pb.close();

    pb = createProgressBars();

    let parsedNovel = await handleParseWebnovel(
        webnovel,
        parsingOptions,
        imageOptions,
        pb
    );

    if (!parsedNovel) {
        return printError("failed to parse webnovel");
    }

    pb.close();

    pb = createProgressBars();

    let exportOptions = await makeExportOptionsSelectionPrompt();
    switch (exportOptions) {
        case ExportOption.WriteEpub:
            await handleWriteEpub(webnovel, imageOptions, pb);
            break;
        case ExportOption.WriteJSON:
            await handleWriteJSON(webnovel, pb);
            break;
    }

    try {
        printLog("cleaning up temp dir");
        await rm(TEMP_FILE_PATH, {
            recursive: true,
            force: true,
        });
    } catch (e) {}
}

async function handleScrapeSingle(
    parsingType: ParsingType,
    pb: MultiProgressBars
) {
    let options = await makeScrapeSingleSelectionPrompt();

    pb.addTask("starting puppeteer...", DefaultProgressBarCustomization);

    let connInfo = await makeNewConnection();

    pb.done("starting puppeteer...", {
        nameTransformFn: () => `started puppeteer`,
    });

    let webnovel: Webnovel | undefined;
    try {
        webnovel = await scrapeWebnovel(
            options.url,
            connInfo,
            parsingType,
            {
                concurrency: options.concurrencyPages,
                timeout: options.timeout,
            },
            pb
        );
    } catch (e) {
        console.log(e);
        printError(`failed to parse webnovel at url ${options.url}`);
    }

    try {
        await connInfo.browser.close();
    } catch (e) {}

    return webnovel;
}

async function handleScrapeMultiple(
    parsingType: ParsingType,
    pb: MultiProgressBars
) {
    let options = await makeScrapeMultipleSelectionPrompt();

    pb.addTask("starting puppeteer...", DefaultProgressBarCustomization);

    let connInfo = await makeNewConnection();

    pb.done("starting puppeteer...", {
        nameTransformFn: () => `started puppeteer`,
    });

    let webnovels: Webnovel[] = [];
    for (let url of options.webnovelURLs) {
        let webnovel: Webnovel | undefined;
        try {
            webnovel = await scrapeWebnovel(
                url,
                connInfo,
                parsingType,
                {
                    concurrency: options.concurrencyPages,
                    timeout: options.timeout,
                },
                pb
            );
        } catch (e) {
            printError(`failed to parse webnovel at url ${url}`);
        }

        if (webnovel) webnovels.push(webnovel);
    }

    try {
        await connInfo.browser.close();
    } catch (e) {}
    if (webnovels.length == 0) return null;

    let combined = await combineWebnovels(webnovels, options.indexToKeepData);

    return combined;
}

async function handleJSONSingle(pb: MultiProgressBars) {
    let options = await makeJSONSingleSelectionPrompt();

    let webnovel: Webnovel | undefined;
    try {
        webnovel = await readWebnovelFromJSON({ path: options.readPath }, pb);
    } catch (e) {
        printError(`failed to parse webnovel at path ${options.readPath}`);
    }

    return webnovel;
}

async function handleJSONMultiple(pb: MultiProgressBars) {
    let options = await makeJSONMultipleSelectionPrompt();

    let webnovels: Webnovel[] = [];
    for (let path of options.readPaths) {
        let webnovel: Webnovel | undefined;
        try {
            webnovel = await readWebnovelFromJSON(
                {
                    path: path,
                },
                pb
            );
        } catch (e) {
            printError(`failed to parse webnovel at path ${path}`);
        }

        webnovels.push(webnovel);
    }

    if (webnovels.length == 0) return null;

    let combined = await combineWebnovels(webnovels, options.indexToKeepData);

    return combined;
}

async function handleParseWebnovel(
    webnovel: Webnovel,
    parserOptions: ParserOptions,
    imageOptions: ImageOptions,
    pb: MultiProgressBars
) {
    pb.addTask("starting puppeteer...", DefaultProgressBarCustomization);

    let connInfo = await makeNewConnection();

    pb.done("starting puppeteer...", {
        nameTransformFn: () => `started puppeteer`,
    });

    let parsedNovel: Webnovel | undefined;
    try {
        parsedNovel = await parseWebnovel(
            webnovel,
            connInfo,
            parserOptions.parsingType,
            {
                concurrency: parserOptions.concurrencyPages,
                timeout: parserOptions.timeout,
            },
            imageOptions,
            pb
        );
    } catch (e) {}

    try {
        await connInfo.browser.close();
    } catch (e) {}

    return parsedNovel;
}

async function handleWriteEpub(
    webnovel: Webnovel,
    imageOptions: ImageOptions,
    pb: MultiProgressBars
) {
    let options = await makeWriteEpubSelectionPrompt();

    pb.addTask("starting puppeteer...", DefaultProgressBarCustomization);

    let connInfo = await makeNewConnection();

    pb.done("starting puppeteer...", {
        nameTransformFn: () => `started puppeteer`,
    });

    try {
        await writeWebnovelToEpub(
            webnovel,
            connInfo,
            { path: options.savePath },
            { timeout: options.timeout, concurrency: 1 },
            imageOptions,
            pb
        );
    } catch (e) {
        printError("failed to write to epub");
    }

    try {
        await connInfo.browser.close();
    } catch (e) {}
}

async function handleWriteJSON(webnovel: Webnovel, pb: MultiProgressBars) {
    let options = await makeWriteJSONSelectionPrompt();

    try {
        await writeWebnovelToJSON(webnovel, { path: options.savePath }, pb);
    } catch (e) {
        printError("failed to write to json");
    }
}

main();
