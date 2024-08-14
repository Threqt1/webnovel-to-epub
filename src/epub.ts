import { createNewPage, downloadImagesLocally } from "./scraper.js";
import { sanitizeFilename } from "./strings.js";
import { join } from "path";
import {
    ConnectionInfo,
    FileSystemOptions,
    ImageOptions,
    ScrapingOptions,
    Webnovel,
} from "./structs.js";
import { MultiProgressBars } from "multi-progress-bars";
import { DefaultProgressBarCustomization } from "./logger.js";

export async function writeWebnovelToEpub(
    webnovel: Webnovel,
    connectionInfo: ConnectionInfo,
    fsOps: FileSystemOptions,
    scrapingOps: ScrapingOptions,
    imageOps: ImageOptions,
    pb: MultiProgressBars
): Promise<void> {
    const Epub = (await import("epub-gen")).default;

    pb.addTask(`cover image`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () =>
            `downloading cover image at url ${webnovel.coverImageURL}...`,
    });

    let page = await createNewPage(connectionInfo, true);

    let coverImagePath = (
        await downloadImagesLocally(
            page,
            webnovel.coverImageURL,
            [webnovel.coverImageURL],
            scrapingOps,
            imageOps
        )
    )[webnovel.coverImageURL];

    pb.done(`cover image`, {
        nameTransformFn: () => `downloaded cover image`,
    });

    pb.addTask(`epub`, {
        ...DefaultProgressBarCustomization,
        nameTransformFn: () => `writing to epub...`,
    });

    const epubOptions = {
        title: webnovel.title,
        author: webnovel.author,
        cover: coverImagePath !== "" ? coverImagePath : undefined,
        content: webnovel.chapters.map((chapter) => {
            return {
                title: chapter.title,
                data: chapter.content,
            };
        }),
        tocTitle: "Table of Contents",
    };

    await new Epub(
        epubOptions,
        join(fsOps.path, `${sanitizeFilename(webnovel.title)}.epub`)
    ).promise;

    pb.done(`epub`, {
        nameTransformFn: () => `wrote to epub`,
    });
}
