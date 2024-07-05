import chalk from "chalk";
import {
    ActionType,
    makeActionSelectionPrompt,
    makeJSONToWebnovelPrompt,
    makeWebnovelToEpubPrompt,
    makeWebnovelToJSONPrompt,
} from "./cli.js";
import { writeWebnovelToEpub } from "./epub.js";
import { readWebnovelFromJSON, writeWebnovelToJSON } from "./json.js";
import { makeNewConnection, scrapeWebnovel } from "./scraper.js";
import { findCorrectParser } from "./parser.js";

/*
TODO:
- add validation for invalid JSON files
- update readme
- add combining two JSON webnovel contents
- add more parsers
- add support for manga
- add comments
*/

async function main() {
    let action = await makeActionSelectionPrompt();
    switch (action) {
        case ActionType.WebnovelToEpub:
            return webnovelToEpub();
        case ActionType.JSONToEpub:
            return jsonToEpub();
        case ActionType.WebnovelToJSON:
            return webnovelToJSON();
        default:
            throw new Error("Not implemented yet");
    }
}

async function webnovelToEpub() {
    let options = await makeWebnovelToEpubPrompt();

    console.log(`${chalk.blue("[LOG]")} starting puppeteer connection`);
    let connectionInfo = await makeNewConnection();

    try {
        let webnovel = await scrapeWebnovel(
            options.url,
            connectionInfo,
            options.concurrency,
            options.timeout
        );

        await writeWebnovelToEpub(webnovel, connectionInfo, options.savePath);
    } catch (e) {
        console.log(e);
    }

    await connectionInfo.browser.close();
}

async function webnovelToJSON() {
    let options = await makeWebnovelToJSONPrompt();
    let connectionInfo = await makeNewConnection();

    try {
        let webnovel = await scrapeWebnovel(
            options.url,
            connectionInfo,
            options.concurrency,
            options.timeout
        );

        await writeWebnovelToJSON(webnovel, options.savePath);
    } catch (e) {
        console.log(e);
    }

    await connectionInfo.browser.close();
}

async function jsonToEpub() {
    let options = await makeJSONToWebnovelPrompt();
    let connectionInfo = await makeNewConnection();

    try {
        let webnovel = await readWebnovelFromJSON(options.readPath);
        await writeWebnovelToEpub(webnovel, connectionInfo, options.savePath);
    } catch (e) {
        console.log(e);
    }

    await connectionInfo.browser.close();
}

main();
