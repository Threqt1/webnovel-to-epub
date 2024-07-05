import { unlink } from "fs/promises";
import { downloadImageLocally, PuppeteerConnectionInfo } from "./scraper.js";
import { htmlifyContent, sanitizeFilename } from "./strings.js";
import { join } from "path";
import { SerializableWebnovel } from "./json.js";

const TEMP_FILE_PATH = "./";

export async function writeWebnovelToEpub(
    webnovel: SerializableWebnovel,
    connectionInfo: PuppeteerConnectionInfo,
    savePath: string
): Promise<void> {
    const Epub = (await import("epub-gen")).default;

    console.log("downloading cover image...");
    let coverImagePath = await downloadImageLocally(
        connectionInfo,
        webnovel.coverImageURL,
        TEMP_FILE_PATH
    );

    const epubOptions = {
        title: webnovel.title,
        author: webnovel.author,
        cover: coverImagePath,
        content: webnovel.chapters.map((chapter) => {
            return {
                title: chapter.title,
                data: htmlifyContent(chapter.content),
            };
        }),
    };

    console.log("creating epub...");

    await new Epub(
        epubOptions,
        join(savePath, `${sanitizeFilename(webnovel.title)}.epub`)
    ).promise;

    await unlink(coverImagePath);
}
