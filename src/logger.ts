import chalk from "chalk";
import { AddOptions } from "multi-progress-bars";

export const DefaultProgressBarCustomization: AddOptions = {
    type: "indefinite",
    barTransformFn: chalk.blue,
};

export function printLog(message: string) {
    console.log(`${chalk.blue("[LOG]")} ${message}`);
}

export function printError(message: string) {
    throw new Error(`${chalk.red("[ERROR]")} ${message}`);
}
