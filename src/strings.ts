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
