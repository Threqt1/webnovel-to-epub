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

/*
TODO:
- add validation for invalid JSON files
- add combining two JSON webnovel contents
- add error handling across the board
- add more parsers
- make pretty logging, dedicated classes
- add readme
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
    let connectionInfo = await makeNewConnection();

    let webnovel = await scrapeWebnovel(
        options.url,
        connectionInfo,
        options.concurrency
    );

    await writeWebnovelToEpub(webnovel, connectionInfo, options.savePath);

    await connectionInfo.browser.close();
}

async function webnovelToJSON() {
    let options = await makeWebnovelToJSONPrompt();
    let connectionInfo = await makeNewConnection();

    let webnovel = await scrapeWebnovel(
        options.url,
        connectionInfo,
        options.concurrency
    );

    await writeWebnovelToJSON(webnovel, options.savePath);

    await connectionInfo.browser.close();
}

async function jsonToEpub() {
    let options = await makeJSONToWebnovelPrompt();
    let connectionInfo = await makeNewConnection();

    let webnovel = await readWebnovelFromJSON(options.readPath);

    await writeWebnovelToEpub(webnovel, connectionInfo, options.savePath);

    await connectionInfo.browser.close();
}

main();
