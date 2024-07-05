import inquirer from "inquirer";
import FileTreeSelectionPrompt from "inquirer-file-tree-selection-prompt";
import download from "downloads-folder";
import urlRegex from "url-regex";
inquirer.registerPrompt("file-tree-selection", FileTreeSelectionPrompt);

export enum ActionType {
    WebnovelToEpub = 0,
    WebnovelToJSON = 1,
    JSONToEpub = 2,
    JSONTools = 3,
}

export type SelectActionInput = {
    action: ActionType;
};

export async function makeActionSelectionPrompt(): Promise<ActionType> {
    let answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "What action would you like to perform?",
            choices: [
                {
                    name: "Scrape a Web Novel to an EPub",
                    value: ActionType.WebnovelToEpub,
                },
                {
                    name: "Scrape a Web Novel to a JSON file",
                    value: ActionType.WebnovelToJSON,
                },
                {
                    name: "Convert a Web Novel JSON file to an EPub",
                    value: ActionType.JSONToEpub,
                },
                {
                    name: "Manipulate Web Novel JSON files",
                    value: ActionType.JSONTools,
                },
            ],
        },
    ]);

    return ActionType[ActionType[answer.action]];
}

export type WebnovelToEpubInput = {
    url: string;
    concurrency: number;
    savePath: string;
    timeout: number;
};

export async function makeWebnovelToEpubPrompt(): Promise<WebnovelToEpubInput> {
    let answers = await inquirer.prompt([
        {
            type: "input",
            name: "url",
            message:
                "Enter the URL for the series's main page (e.g. https://woopread.com/series/sss-class-suicide-hunter/):\n",
            validate(input: string) {
                return urlRegex({ strict: true }).test(input);
            },
        },
        {
            type: "number",
            name: "concurrency",
            message:
                "Enter the maximum amount of concurrent tabs (recommended 3):\n",
        },
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "savePath",
            message: "Select the directory to save the EPub to:\n",
            root: download(),
            onlyShowDir: true,
        },
        {
            type: "number",
            name: "timeout",
            message:
                "Enter the maximum amount of time the code should wait for a page to load (recommended 10000ms):",
        },
    ]);

    return answers;
}

export type WebnovelToJSONInput = {
    url: string;
    concurrency: number;
    savePath: string;
    timeout: number;
};

export async function makeWebnovelToJSONPrompt(): Promise<WebnovelToJSONInput> {
    let answers = await inquirer.prompt([
        {
            type: "input",
            name: "url",
            message:
                "Enter the URL for the series's main page (e.g. https://woopread.com/series/sss-class-suicide-hunter/):\n",
            validate(input: string) {
                return urlRegex({ strict: true }).test(input);
            },
        },
        {
            type: "number",
            name: "concurrency",
            message:
                "Enter the maximum amount of concurrent tabs (recommended 3):\n",
        },
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "savePath",
            message: "Select the directory to save the JSON to:\n",
            root: download(),
            onlyShowDir: true,
        },
        {
            type: "number",
            name: "timeout",
            message:
                "Enter the maximum amount of time the code should wait for a page to load (recommended 10000ms):",
        },
    ]);

    return answers;
}

export type JSONToWebnovelInput = {
    readPath: string;
    savePath: string;
};

export async function makeJSONToWebnovelPrompt(): Promise<JSONToWebnovelInput> {
    let answers = await inquirer.prompt([
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "readPath",
            message: "Select the webnovel JSON:\n",
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
        {
            type: "file-tree-selection",
            enableGoUpperDirectory: true,
            name: "savePath",
            message: "Select the directory to save the EPub to:\n",
            root: download(),
            onlyShowDir: true,
        },
    ]);

    return answers;
}
