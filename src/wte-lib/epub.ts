import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import {
    JSONSchema,
    type ChapterEpubItem,
    type EpubItem,
    type Metadata,
    type Webnovel,
} from "./structs.js";
import {
    createContainerXML,
    createContentOPF,
    createTocNCX,
    createTOCXHTML,
} from "./xhtml.js";
import { createWriteStream } from "fs";
import { access, rm } from "fs/promises";
import archiver from "archiver";
import * as unzipper from "unzipper";
import { ERRORS, METADATA_FILE_NAME } from "./strings.js";

/*
META-INF
    container.xml
OEBPS
    Fonts
    Images
    Text
    content.opf
    toc.xhtml
    toc.ncx
*/
export const IMAGE_DIR = "Images";
export const TEXT_DIR = "Text";
export const FONT_DIR = "Fonts";

export async function createStagingDirectory(stagingPath: string) {
    await mkdir(stagingPath);
    await mkdir(join(stagingPath, "META-INF"));
    await mkdir(join(stagingPath, "OEBPS"));
    await mkdir(join(stagingPath, "OEBPS", FONT_DIR));
    await mkdir(join(stagingPath, "OEBPS", IMAGE_DIR));
    await mkdir(join(stagingPath, "OEBPS", TEXT_DIR));
}

export async function clearStagingDirectory(stagingPath: string) {
    await rm(stagingPath, {
        recursive: true,
        force: true,
    });
}

export async function createEpub(
    webnovel: Webnovel,
    stagingPath: string,
    outPath: string
) {
    await writeFile(
        join(stagingPath, "META-INF", "container.xml"),
        createContainerXML()
    );
    await writeFile(
        join(stagingPath, "OEBPS", "content.opf"),
        createContentOPF(
            webnovel.metadata,
            webnovel.metadata.coverImage,
            webnovel.chapters,
            webnovel.items
        )
    );
    await writeFile(
        join(stagingPath, "OEBPS", "toc.ncx"),
        createTocNCX(webnovel.metadata, webnovel.chapters)
    );
    await writeFile(
        join(stagingPath, "OEBPS", "toc.xhtml"),
        createTOCXHTML(webnovel.metadata, webnovel.chapters)
    );

    let wteMetadataFile = JSON.stringify(webnovel);

    return zipDirectoryToEpub(stagingPath, outPath, [
        { name: METADATA_FILE_NAME, content: wteMetadataFile },
    ]);
}

export async function zipDirectoryToEpub(
    stagingPath: string,
    outPath: string,
    additional: { name: string; content: string }[]
) {
    let output = await createWriteStream(outPath);
    let archive = archiver("zip", {
        zlib: {
            level: 9,
        },
    });

    return new Promise((resolve, _) => {
        archive.append("application/epub+zip", {
            store: true,
            name: "mimetype",
        });
        for (let file of additional) {
            archive.append(file.content, { name: file.name });
        }
        archive.directory(join(stagingPath, "META-INF"), "META-INF");
        archive.directory(join(stagingPath, "OEBPS"), "OEBPS");

        archive.pipe(output);
        archive.on("end", () => resolve(true));
        archive.finalize();
    });
}

export async function unzipAndParseEpub(
    epubPath: string,
    outPath: string
): Promise<Webnovel> {
    const epub = await unzipper.Open.file(epubPath);
    await epub.extract({ path: outPath });

    let metadataPath = join(outPath, METADATA_FILE_NAME);
    let error = false;
    try {
        await access(metadataPath);
    } catch (e) {
        error = true;
    }

    if (error) throw new Error(ERRORS.InvalidEpub(epubPath));

    let metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

    error = false;
    let webnovel: Webnovel | undefined;
    try {
        webnovel = await JSONSchema.cast(metadata);
    } catch (e) {
        error = true;
    }

    if (error) throw new Error(ERRORS.InvalidEpub(epubPath));

    return webnovel!;
}
