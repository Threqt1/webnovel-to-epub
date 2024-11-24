import chalk from "chalk";

export function printLog(message: string) {
    console.log(`${chalk.blue("[LOG]")} ${message}`);
}

export function printError(message: string) {
    throw new Error(`${chalk.red("[ERROR]")} ${message}`);
}
