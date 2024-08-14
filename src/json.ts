import { readFile, writeFile } from "fs/promises";
import path, { join } from "path";
import { sanitizeFilename } from "./strings.js";
import { Validator } from "jsonschema";
import {
    FileSystemOptions,
    SerializableWebnovelSchema,
    Webnovel,
} from "./structs.js";
import { DefaultProgressBarCustomization, printError } from "./logger.js";
import { MultiProgressBars } from "multi-progress-bars";
const validator = new Validator();

export async function writeWebnovelToJSON(
    webnovel: Webnovel,
    fsOps: FileSystemOptions,
    pb: MultiProgressBars
): Promise<void> {
    let webnovelString = JSON.stringify(webnovel);

    pb.addTask(`writing`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => `writing to json...`,
    });

    await writeFile(
        join(fsOps.path, `${sanitizeFilename(webnovel.title)}.json`),
        webnovelString
    );

    pb.done(`writing`, {
        nameTransformFn: () => `wrote to json`,
    });
}

export async function readWebnovelFromJSON(
    fsOps: FileSystemOptions,
    pb: MultiProgressBars
): Promise<Webnovel> {
    let webnovelString: string = "";

    pb.addTask(`read`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => `writing and parsing JSON...`,
    });

    webnovelString = await readFile(fsOps.path, { encoding: "utf8" });

    let webnovel: Webnovel = JSON.parse(webnovelString);

    let validity = validator.validate(webnovel, SerializableWebnovelSchema);
    if (!validity) {
        printError(`invalid JSON format at path ${path}`);
        throw new Error();
    }

    pb.done(`read`, {
        nameTransformFn: () => `wrote and parsed JSON`,
    });

    return webnovel;
}

export function combineWebnovels(
    webnovels: Webnovel[],
    indexToKeepData: number
): Webnovel {
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

    return newWebnovel;
}
