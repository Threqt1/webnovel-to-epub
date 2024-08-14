import { join } from "path";

export const TEMP_FILE_PATH = join(import.meta.dirname, ".", "temp");

export function sanitizeFilename(filename: string) {
    return filename
        .toLowerCase()
        .replace(/([^\w\s\d\-_~,;\[\]\(\).])/g, "")
        .replace(/([\.]{2,})/g, "")
        .replace(/ /g, "-");
}

export function htmlifyContent(content: string) {
    return `<p>${content.replace(/\n/g, "</p><p>")}</p>`;
}

export function getFilePathFromURL(url: string, defaultExtension = "png") {
    let fileNameSplit = url.split("/").at(-1).split(".");
    let fileName = fileNameSplit[0];
    let fileExtension = fileNameSplit[1] ?? defaultExtension;
    return join(
        TEMP_FILE_PATH,
        `${sanitizeFilename(fileName)}.${fileExtension}`
    );
}
