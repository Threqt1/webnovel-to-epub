import inquirer from "inquirer";
import FileTreeSelectionPrompt from "inquirer-file-tree-selection-prompt";
import download from "downloads-folder";
import urlRegex from "url-regex";
import { type ImageOptions, ParsingType } from "./wte-pkg/structs.js";
inquirer.registerPrompt("file-tree-selection", FileTreeSelectionPrompt);

export enum ScraperOption {
    ScrapeSingle = 0,
    ScrapeMultiple = 1,
    JSONSingle = 2,
    JSONMultiple = 3,
}

export async function makeScrapingOptionsSelectionPrompt(): Promise<ScraperOption> {
    let answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "How would you like to obtain a webnovel?",
            choices: [
                {
                    name: "Scrape a webnovel from the web",
                    value: ScraperOption.ScrapeSingle,
                },
                {
                    name: "Scrape and combine multiple webnovels from the web",
                    value: ScraperOption.ScrapeMultiple,
                },
                {
                    name: "Parse a existing webnovel JSON file",
                    value: ScraperOption.JSONSingle,
                },
                {
                    name: "Parse and combine multiple webnovel JSON files",
                    value: ScraperOption.JSONSingle,
                },
            ],
        },
    ]);

    return ScraperOption[
        ScraperOption[answer.action] as any
    ] as unknown as ScraperOption;
}

type ScrapeSingleOptions = {
    url: string;
    concurrencyPages: number;
    timeout: number;
};

export async function makeScrapeSingleSelectionPrompt(): Promise<ScrapeSingleOptions> {
    let answers = await inquirer.prompt([
        {
            type: "input",
            name: "url",
            message:
                "Enter the URL for the webnovel's main page (with the table of contents):\n",
            validate(input: string) {
                return urlRegex({ strict: true }).test(input);
            },
        },
        {
            type: "number",
            name: "concurrencyPages",
            message:
                "Enter the maximum amount of concurrent tabs to scrape with (default 3):\n",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 3,
        },
        {
            type: "number",
            name: "timeout",
            message:
                "Enter the maximum amount of time to wait for a page to load (default 10000ms):",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 10000,
        },
    ]);

    return {
        url: answers.url,
        concurrencyPages: answers.concurrencyPages,
        timeout: answers.timeout,
    };
}

type ScrapeMultipleOptions = {
    webnovelURLs: string[];
    indexToKeepData: number;
    concurrencyPages: number;
    timeout: number;
};

export async function makeScrapeMultipleSelectionPrompt(): Promise<ScrapeMultipleOptions> {
    let answers = await inquirer.prompt([
        {
            type: "input",
            name: "webnovelURLs",
            message:
                "Enter a list of webnovel URLs (use a comma seperated list of links - order matters):\n",
            validate: (input: string) => {
                let splitURLs = input.replace(/ /g, "").split(",");
                if (splitURLs.length == 0) return false;
                for (let splitURL of splitURLs) {
                    if (!urlRegex().test(splitURL)) return false;
                }
                return true;
            },
        },
        {
            type: "list",
            name: "indexToKeepData",
            message:
                "Select the URL to keep metadata from (title, author, etc):\n",
            choices: (answers) => {
                return answers.webnovelURLs
                    .replace(/ /g, "")
                    .split(",")
                    .map((path: string, index: number) => {
                        return { name: path, value: index };
                    });
            },
        },
        {
            type: "number",
            message:
                "Enter the maximum amount of concurrent tabs to scrape with (default 3)",
            name: "concurrencyPages",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 3,
        },
        {
            type: "number",
            message:
                "Enter the maximum timeout for a page to load (recommended 10000ms)",
            name: "timeout",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 10000,
        },
    ]);
    return {
        webnovelURLs: answers.webnovelURLs.replace(/ /g, "").split(","),
        indexToKeepData: answers.indexToKeepData,
        concurrencyPages: answers.concurrencyPages,
        timeout: answers.timeout,
    };
}

type JSONSingleOptions = {
    readPath: string;
};

export async function makeJSONSingleSelectionPrompt(): Promise<JSONSingleOptions> {
    let answers = await inquirer.prompt([
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "readPath",
            message: "Select the JSON file:\n",
            root: download(),
            onlyShowValid: true,
            validate: (input: string) => {
                let fileName = input.split("/").at(-1);
                if (fileName === undefined) return false;
                let fileExtension = fileName.split(".").at(-1);
                if (fileExtension === undefined) return false;
                return fileExtension.toLowerCase() === "json";
            },
        },
    ]);

    return answers;
}

type JSONMultipleOptions = {
    readPaths: string[];
    indexToKeepData: number;
};

export async function makeJSONMultipleSelectionPrompt(): Promise<JSONMultipleOptions> {
    let answers = await inquirer.prompt([
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "readPaths",
            message: "Select the JSON files:\n",
            root: download(),
            onlyShowValid: true,
            multiple: true,
            validate: (input: string) => {
                let fileName = input.split("/").at(-1);
                if (fileName === undefined) return false;
                let fileExtension = fileName.split(".").at(-1);
                if (fileExtension === undefined) return false;
                return fileExtension.toLowerCase() === "json";
            },
        },
        {
            type: "list",
            name: "indexToKeepData",
            message:
                "Select the path to keep metadata from (title, author, etc):\n",
            choices: (answers) => {
                return answers.readPaths.map((path: string, index: number) => {
                    return { name: path, value: index };
                });
            },
        },
    ]);

    return answers;
}

export type ParserOptions = {
    parsingType: ParsingType;
    concurrencyPages: number;
    timeout: number;
};

export async function makeParsingOptionSelectionPrompt(): Promise<ParserOptions> {
    let answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "How would you like to parse the webnovel's chapters?",
            choices: [
                {
                    name: "Keep the chapter's format and images (slow)",
                    value: ParsingType.WithImage,
                },
                {
                    name: "Keep the chapter's format only (slowish)",
                    value: ParsingType.WithFormat,
                },
                {
                    name: "Keep the chapter's text only (fast)",
                    value: ParsingType.TextOnly,
                },
            ],
        },
        {
            type: "number",
            message:
                "Enter the maximum amount of concurrent pages to parse with (default 3)",
            name: "concurrencyPages",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 3,
            when: (answers) => {
                return answers["action"] === ParsingType.WithImage;
            },
        },
        {
            type: "number",
            message:
                "Enter the maximum timeout for a page to load (recommended 10000ms)",
            name: "timeout",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 10000,
            when: (answers) => {
                return answers["action"] === ParsingType.WithImage;
            },
        },
    ]);

    return {
        parsingType: ParsingType[
            ParsingType[answer.action] as any
        ] as unknown as ParsingType,
        concurrencyPages: answer.concurrencyPages ?? 0,
        timeout: answer.timeout ?? 0,
    };
}

export async function makeImageOptionsPrompt(): Promise<ImageOptions> {
    let answer = await inquirer.prompt([
        {
            type: "number",
            message:
                "Enter the quality the images should be compressed to (recommended 80%) (helps with file size)",
            name: "imageQuality",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 80,
        },
        {
            type: "confirm",
            message:
                "Would you like to resize the images? This may help further reduce file size",
            name: "shouldResize",
            default: false,
        },
        {
            type: "number",
            message: "Enter the maximum width of the resized images",
            name: "width",
            validate: (input: number) => {
                return !isNaN(input);
            },
            when: (answers) => {
                return answers["shouldResize"] === true;
            },
        },
        {
            type: "number",
            message: "Enter the maximum height of the resized images",
            name: "height",
            validate: (input: number) => {
                return !isNaN(input);
            },
            when: (answers) => {
                return answers["shouldResize"] === true;
            },
        },
    ]);

    return {
        quality: answer.imageQuality,
        shouldResize: answer.shouldResize,
        maxWidth: answer.width ?? 0,
        maxHeight: answer.height ?? 0,
    };
}

export enum ExportOption {
    WriteEpub = 0,
    WriteJSON = 1,
}

export async function makeExportOptionsSelectionPrompt(): Promise<ExportOption> {
    let answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "What would you like to do with the webnovel?",
            choices: [
                {
                    name: "Write the webnovel to a epub file",
                    value: ExportOption.WriteEpub,
                },
                {
                    name: "Write the webnovel to a JSON file",
                    value: ExportOption.WriteJSON,
                },
            ],
        },
    ]);

    return ExportOption[
        ExportOption[answer.action] as any
    ] as unknown as ExportOption;
}

type WriteEpubOptions = {
    savePath: string;
    timeout: number;
};

export async function makeWriteEpubSelectionPrompt(): Promise<WriteEpubOptions> {
    let answer = await inquirer.prompt([
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "savePath",
            message: "Select the directory to save the epub to:\n",
            root: download(),
            onlyShowDir: true,
        },
        {
            type: "number",
            message:
                "Enter the maximum timeout for a page to load (recommended 10000ms)",
            name: "timeout",
            validate: (input: number) => {
                return !isNaN(input);
            },
            default: 10000,
        },
    ]);

    return answer;
}

type WriteJSONOptions = {
    savePath: string;
};

export async function makeWriteJSONSelectionPrompt(): Promise<WriteJSONOptions> {
    let answer = await inquirer.prompt([
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "savePath",
            message: "Select the directory to save the JSON to:\n",
            root: download(),
            onlyShowDir: true,
        },
    ]);

    return answer;
}
