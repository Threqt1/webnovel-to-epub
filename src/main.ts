import { mkdir, rm, writeFile } from "fs/promises";
import {
    makeJSONMultipleSelectionPrompt,
    makeJSONSingleSelectionPrompt,
    makeParsingOptionsSelectionPrompt,
    makeScrapeMultipleSelectionPrompt,
    makeScrapeSingleSelectionPrompt,
    makeWebnovelOptionsSelectionPrompt,
    makeWriteEpubSelectionPrompt,
    makeWriteJSONSelectionPrompt,
    ParsingOption,
    WebnovelOption,
} from "./cli.js";
import { writeWebnovelToEpub } from "./epub.js";
import {
    combineWebnovels,
    readWebnovelFromJSON,
    Webnovel,
    writeWebnovelToJSON,
} from "./json.js";
import {
    createNewPage,
    makeNewConnection,
    PuppeteerConnectionInfo,
    scrapeWebnovel,
} from "./scraper.js";
import { PromisePool } from "@supercharge/promise-pool";
import { MultiProgressBars } from "multi-progress-bars";
import { getFilePathFromURL, TEMP_FILE_PATH } from "./strings.js";
import { printLog } from "./logger.js";

/*
TODO:
- add functionality to parse multiple urls and combine into ebook
- add support for a chapter parsing method using the "next" button
- add validation for invalid JSON files
- update readme
- add combining two JSON webnovel contents
- add more parsers
- add support for manga
- add comments
*/

async function main() {
    try {
        printLog("making temp dir");
        await mkdir(TEMP_FILE_PATH);
    } catch (e) {}
    let parsingOption = await makeParsingOptionsSelectionPrompt();
    let progressBars = new MultiProgressBars({
        initMessage: "Webnovel To Epub",
        anchor: "top",
        persist: true,
        border: true,
    });
    let webnovel: Webnovel | undefined;
    switch (parsingOption) {
        case ParsingOption.ScrapeSingle:
            webnovel = await handleScrapeSingle(progressBars);
            break;
        case ParsingOption.ScrapeMultiple:
            webnovel = await handleScrapeMultiple(progressBars);
            break;
        case ParsingOption.JSONSingle:
            webnovel = await handleJSONSingle(progressBars);
            break;
        case ParsingOption.JSONMultiple:
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

async function handleScrapeSingle(pb: MultiProgressBars): Promise<Webnovel> {
    let options = await makeScrapeSingleSelectionPrompt();
    let connectionInfo = await makeNewConnection();

    let webnovel = await scrapeWebnovel(
        options.url,
        connectionInfo,
        options.concurrencyPages,
        options.timeout,
        pb
    );

    await connectionInfo.browser.close();

    return webnovel;
}

async function handleScrapeMultiple(pb: MultiProgressBars): Promise<Webnovel> {
    let options = await makeScrapeMultipleSelectionPrompt();

    let connectionInfos: PuppeteerConnectionInfo[] = [];
    for (let i = 0; i < options.concurrencyBrowsers; i++) {
        let info = await makeNewConnection();
        connectionInfos.push(info);
    }

    const { results } = await PromisePool.withConcurrency(
        options.concurrencyBrowsers
    )
        .for(options.webnovelURLs)
        .process(async (url) => {
            let connectionInfo = connectionInfos.pop();
            let webnovel = await scrapeWebnovel(
                url,
                connectionInfo,
                options.concurrencyPages,
                options.timeout,
                pb
            );
            connectionInfos.push(connectionInfo);
            return webnovel;
        });

    for (let info of connectionInfos) {
        await info.browser.close();
    }

    let combined = await combineWebnovels(results, options.indexToKeepData, pb);

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

async function handleWriteEpub(webnovel: Webnovel, pb: MultiProgressBars) {
    let options = await makeWriteEpubSelectionPrompt();
    let connectionInfo = await makeNewConnection();

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
