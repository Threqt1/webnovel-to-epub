import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "./wte-pkg/strings.js";
import {
    type FileSystemOptions,
    SerializableWebnovelSchema,
    type Webnovel,
} from "./wte-pkg/structs.js";
import { DefaultProgressBarCustomization } from "./logger.js";
import { MultiProgressBars } from "multi-progress-bars";

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

    await SerializableWebnovelSchema.validate(webnovel);

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

    let dataKeptWebnovel = webnovels[indexToKeepData]!;
    newWebnovel.title = dataKeptWebnovel.title;
    newWebnovel.author = dataKeptWebnovel.author;
    newWebnovel.coverImageURL = dataKeptWebnovel.coverImageURL;

    for (let webnovel of webnovels) {
        newWebnovel.chapters = newWebnovel.chapters.concat(webnovel.chapters);
    }

    return newWebnovel;
}
