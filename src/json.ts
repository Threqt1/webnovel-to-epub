import { readFile, writeFile } from "fs/promises";
import { ChapterWithContent } from "./parsers/baseParser.js";
import { join } from "path";
import { sanitizeFilename } from "./strings.js";

export type SerializableWebnovel = {
    title: string;
    author: string;
    coverImageURL: string;
    chapters: ChapterWithContent[];
};

export async function writeWebnovelToJSON(
    webnovel: SerializableWebnovel,
    path: string
): Promise<void> {
    console.log("writing JSON...");
    let webnovelString = JSON.stringify(webnovel);

    await writeFile(
        join(path, `${sanitizeFilename(webnovel.title)}.json`),
        webnovelString
    );
}

export async function readWebnovelFromJSON(
    path: string
): Promise<SerializableWebnovel> {
    console.log("reading and parsing JSON...");
    let webnovelString = await readFile(path, { encoding: "utf8" });

    let webnovel = JSON.parse(webnovelString);

    return webnovel;
}
