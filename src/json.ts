import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "./strings.js";
import chalk from "chalk";
import { Validator } from "jsonschema";
import { MultiProgressBars } from "multi-progress-bars";
import {
    DefaultProgressBarCustomization,
    printError,
    printLog,
} from "./logger.js";
const validator = new Validator();

export interface Chapter {
    title: string;
    url: string;
    isContentFilled: boolean;
    content: string;
}

export type Webnovel = {
    title: string;
    author: string;
    coverImageURL: string;
    chapters: Chapter[];
};

let SerializableWebnovelSchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        author: { type: "string" },
        coverImageURL: { type: "string" },
        chapters: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    content: { type: "string" },
                },
            },
        },
    },
};

export async function writeWebnovelToJSON(
    webnovel: Webnovel,
    path: string,
    pb: MultiProgressBars
): Promise<void> {
    pb.addTask("Writing to JSON", { ...DefaultProgressBarCustomization });
    printLog(`JSON path at ${chalk.dim(path)}`);

    let webnovelString = JSON.stringify(webnovel);

    await writeFile(
        join(path, `${sanitizeFilename(webnovel.title)}.json`),
        webnovelString
    ).catch((e) => {
        printError(`unable to write to file at ${path}\n${e}`);
    });

    pb.done("Writing to JSON");
}

export async function readWebnovelFromJSON(
    path: string,
    pb: MultiProgressBars
): Promise<Webnovel> {
    pb.addTask("Reading JSON", { ...DefaultProgressBarCustomization });
    printLog(`JSON path at ${chalk.dim(path)}`);

    let webnovelString: string = "";
    try {
        webnovelString = await readFile(path, { encoding: "utf8" });
    } catch (e) {
        printError(`unable to read file at ${path}\n${e}`);
    }

    pb.done("Reading/Parsing JSON");
    pb.addTask("Parsing JSON", { ...DefaultProgressBarCustomization });

    let webnovel: Webnovel | undefined;
    try {
        webnovel = JSON.parse(webnovelString);
    } catch (e) {
        printError(`unable to parse JSON\n${e}`);
    }

    let validity = validator.validate(webnovel, SerializableWebnovelSchema);
    if (!validity) printError(`invalid JSON format`);

    pb.done("Parsing JSON");

    return webnovel;
}

export function combineWebnovels(
    webnovels: Webnovel[],
    indexToKeepData: number,
    pb: MultiProgressBars
): Webnovel {
    pb.addTask("Combining Webnovels", { ...DefaultProgressBarCustomization });

    let newWebnovel: Webnovel = {
        title: "",
        author: "",
        coverImageURL: "",
        chapters: [],
    };

    if (indexToKeepData >= webnovels.length || indexToKeepData < 0)
        indexToKeepData = 0;

    let dataKeptWebnovel = webnovels[indexToKeepData];
    newWebnovel.title = dataKeptWebnovel.title;
    newWebnovel.author = dataKeptWebnovel.author;
    newWebnovel.coverImageURL = dataKeptWebnovel.coverImageURL;

    for (let webnovel of webnovels) {
        newWebnovel.chapters = newWebnovel.chapters.concat(webnovel.chapters);
    }

    pb.done("Combining Webnovels");

    return newWebnovel;
}
