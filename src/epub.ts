import { unlink } from "fs/promises";
import {
    createNewPage,
    downloadImageLocally,
    PuppeteerConnectionInfo,
} from "./scraper.js";
import { htmlifyContent, sanitizeFilename } from "./strings.js";
import { join } from "path";
import { Webnovel } from "./json.js";
import chalk from "chalk";
import { MultiProgressBars } from "multi-progress-bars";
import { DefaultProgressBarCustomization, printLog } from "./logger.js";

const TEMP_FILE_PATH = "./";

export async function writeWebnovelToEpub(
    webnovel: Webnovel,
    connectionInfo: PuppeteerConnectionInfo,
    savePath: string,
    timeout: number,
    pb: MultiProgressBars
): Promise<void> {
    const Epub = (await import("epub-gen")).default;

    pb.addTask("Downloading Cover Image", {
        ...DefaultProgressBarCustomization,
    });

    printLog(`cover image located at url ${chalk.dim(webnovel.coverImageURL)}`);

    let page = await createNewPage(connectionInfo, true);

    let coverImagePath = await downloadImageLocally(
        page,
        webnovel.coverImageURL,
        timeout,
        TEMP_FILE_PATH
    );

    pb.done("Downloading Cover Image");

    const epubOptions = {
        title: webnovel.title,
        author: webnovel.author,
        cover: coverImagePath !== "" ? coverImagePath : undefined,
        content: webnovel.chapters.map((chapter) => {
            return {
                title: chapter.title,
                data: htmlifyContent(chapter.content),
            };
        }),
    };

    pb.addTask("Creating EPUB", {
        ...DefaultProgressBarCustomization,
    });

    await new Epub(
        epubOptions,
        join(savePath, `${sanitizeFilename(webnovel.title)}.epub`)
    ).promise;

    pb.done("Creating EPUB");

    await unlink(coverImagePath);
}
