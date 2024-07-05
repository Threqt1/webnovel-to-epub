import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "./strings.js";
import chalk from "chalk";
import { Validator } from "jsonschema";
const validator = new Validator();

export interface ChapterInformation {
    title: string;
    url: string;
}

export interface ChapterWithContent {
    title: string;
    content: string;
}

export type SerializableWebnovel = {
    title: string;
    author: string;
    coverImageURL: string;
    chapters: ChapterWithContent[];
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
                    content: { type: "string" },
                },
            },
        },
    },
};

export async function writeWebnovelToJSON(
    webnovel: SerializableWebnovel,
    path: string
): Promise<void> {
    console.log(
        `${chalk.blue("[LOG]")} writing to JSON at path ${chalk.dim(path)}`
    );
    let webnovelString = JSON.stringify(webnovel);

    await writeFile(
        join(path, `${sanitizeFilename(webnovel.title)}.json`),
        webnovelString
    ).catch((e) => {
        throw new Error(
            `${chalk.red("[ERROR]")} unable to write to file at ${path}\n${e}`
        );
    });
}

export async function readWebnovelFromJSON(
    path: string
): Promise<SerializableWebnovel> {
    console.log(
        `${chalk.blue("[LOG]")} reading and parsing JSON at ${chalk.dim(path)}`
    );
    let webnovelString: string = "";
    try {
        webnovelString = await readFile(path, { encoding: "utf8" });
    } catch (e) {
        throw new Error(
            `${chalk.red("[ERROR]")} unable to read file at ${path}\n${e}`
        );
    }

    let webnovel: SerializableWebnovel | undefined;
    try {
        webnovel = JSON.parse(webnovelString);
    } catch (e) {
        throw new Error(`${chalk.red("[ERROR]")} unable to parse JSON\n${e}`);
    }

    let validity = validator.validate(webnovel, SerializableWebnovelSchema);
    if (!validity) throw new Error(`${chalk.red("[ERROR]")} invalid JSON`);

    return webnovel;
}
