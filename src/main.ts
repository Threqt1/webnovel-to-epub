import { mkdir, rm } from "fs/promises";
import {
    makeJSONMultipleSelectionPrompt,
    makeJSONSingleSelectionPrompt,
    makeScrapingOptionsSelectionPrompt,
    makeScrapeMultipleSelectionPrompt,
    makeScrapeSingleSelectionPrompt,
    makeWebnovelOptionsSelectionPrompt,
    makeWriteEpubSelectionPrompt,
    makeWriteJSONSelectionPrompt,
    ParserOption,
    ScraperOption,
    WebnovelOption,
    makeParsingOptionSelectionPrompt,
    makeParserWithImagesSelectionPrompt,
    ParserWithImagesOptions,
} from "./cli.js";
import { writeWebnovelToEpub } from "./epub.js";
import {
    combineWebnovels,
    readWebnovelFromJSON,
    Webnovel,
    writeWebnovelToJSON,
} from "./json.js";
import { makeNewConnection, scrapeWebnovel } from "./scraper.js";
import { MultiProgressBars } from "multi-progress-bars";
import { TEMP_FILE_PATH } from "./strings.js";
import { DefaultProgressBarCustomization, printLog } from "./logger.js";
import { parseWebnovel } from "./parser.js";

/*
TODO:
- add support for a chapter parsing method using the "next" button
- update readme
- add more parsers
- add comments
*/

async function main() {
    try {
        printLog("making temp dir");
        await mkdir(TEMP_FILE_PATH);
    } catch (e) {}
    let scrapingOption = await makeScrapingOptionsSelectionPrompt();
    let parsingOption = await makeParsingOptionSelectionPrompt();

    let extraParsingOptions: ParserWithImagesOptions | undefined;
    switch (parsingOption) {
        case ParserOption.WithImage:
            extraParsingOptions = await makeParserWithImagesSelectionPrompt();
            break;
        default:
    }

    let progressBars = new MultiProgressBars({
        initMessage: "Webnovel To Epub",
        anchor: "top",
        persist: true,
        border: true,
    });
    let webnovel: Webnovel | undefined;
    switch (scrapingOption) {
        case ScraperOption.ScrapeSingle:
            webnovel = await handleScrapeSingle(parsingOption, progressBars);
            break;
        case ScraperOption.ScrapeMultiple:
            webnovel = await handleScrapeMultiple(parsingOption, progressBars);
            break;
        case ScraperOption.JSONSingle:
            webnovel = await handleJSONSingle(progressBars);
            break;
        case ScraperOption.JSONMultiple:
            webnovel = await handleJSONMultiple(progressBars);
            break;
    }
    progressBars.close();

    progressBars = new MultiProgressBars({
        initMessage: "Webnovel To Epub",
        anchor: "top",
        persist: true,
        border: true,
    });
    await handleParseWebnovel(
        webnovel,
        parsingOption,
        progressBars,
        extraParsingOptions
    );
    progressBars.close();

    progressBars = new MultiProgressBars({
        initMessage: "Webnovel To Epub",
        anchor: "top",
        persist: true,
        border: true,
    });
    let webnovelOption = await makeWebnovelOptionsSelectionPrompt();
    switch (webnovelOption) {
        case WebnovelOption.WriteEpub:
            await handleWriteEpub(webnovel, progressBars);
            break;
        case WebnovelOption.WriteJSON:
            await handleWriteJSON(webnovel, progressBars);
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
    parserType: ParserOption,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let options = await makeScrapeSingleSelectionPrompt();

    pb.addTask("Starting Puppeteer", {
        ...DefaultProgressBarCustomization,
    });

    let connectionInfo = await makeNewConnection();

    pb.done("Starting Puppeteer");

    let webnovel = await scrapeWebnovel(
        options.url,
        connectionInfo,
        parserType,
        options.concurrencyPages,
        options.timeout,
        pb
    );

    await connectionInfo.browser.close();

    return webnovel;
}

async function handleScrapeMultiple(
    parserType: ParserOption,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let options = await makeScrapeMultipleSelectionPrompt();

    pb.addTask("Starting Puppeteer", {
        ...DefaultProgressBarCustomization,
    });

    let connectionInfo = await makeNewConnection();

    pb.done("Starting Puppeteer");

    let webnovels = [];
    for (let url of options.webnovelURLs) {
        let webnovel = await scrapeWebnovel(
            url,
            connectionInfo,
            parserType,
            options.concurrencyPages,
            options.timeout,
            pb
        );
        webnovels.push(webnovel);
    }

    await connectionInfo.browser.close();

    let combined = await combineWebnovels(
        webnovels,
        options.indexToKeepData,
        pb
    );

    return combined;
}

async function handleJSONSingle(pb: MultiProgressBars): Promise<Webnovel> {
    let options = await makeJSONSingleSelectionPrompt();

    let webnovel = await readWebnovelFromJSON(options.readPath, pb);

    return webnovel;
}

async function handleJSONMultiple(pb: MultiProgressBars): Promise<Webnovel> {
    let options = await makeJSONMultipleSelectionPrompt();

    let webnovels = [];
    for (let path of options.readPaths) {
        let webnovel = await readWebnovelFromJSON(path, pb);
        webnovels.push(webnovel);
    }

    let combined = await combineWebnovels(
        webnovels,
        options.indexToKeepData,
        pb
    );

    return combined;
}

async function handleParseWebnovel(
    webnovel: Webnovel,
    parserType: ParserOption,
    pb: MultiProgressBars,
    extraOptions?: ParserWithImagesOptions
): Promise<Webnovel> {
    pb.addTask("Starting Puppeteer", {
        ...DefaultProgressBarCustomization,
    });

    let connectionInfo = await makeNewConnection();

    pb.done("Starting Puppeteer");

    extraOptions = extraOptions ?? { timeout: 10000, concurrencyPages: 1 };

    let parsedWebnovel = await parseWebnovel(
        connectionInfo,
        webnovel,
        parserType,
        extraOptions.concurrencyPages,
        extraOptions.timeout,
        pb
    );

    await connectionInfo.browser.close();

    return parsedWebnovel;
}

async function handleWriteEpub(webnovel: Webnovel, pb: MultiProgressBars) {
    let options = await makeWriteEpubSelectionPrompt();

    pb.addTask("Starting Puppeteer", {
        ...DefaultProgressBarCustomization,
    });

    let connectionInfo = await makeNewConnection();

    pb.done("Starting Puppeteer");

    await writeWebnovelToEpub(
        webnovel,
        connectionInfo,
        options.savePath,
        options.timeout,
        pb
    );

    await connectionInfo.browser.close();
}

async function handleWriteJSON(webnovel: Webnovel, pb: MultiProgressBars) {
    let options = await makeWriteJSONSelectionPrompt();

    await writeWebnovelToJSON(webnovel, options.savePath, pb);
}

main();
