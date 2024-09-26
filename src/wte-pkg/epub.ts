import { mkdir, writeFile } from "fs/promises";
import { basename, join } from "path";
import type { ChapterEpubItem, EpubItem, Metadata } from "./structs.js";
import { createContainerXML, createContentOPF, createTocNCX, createTOCXHTML } from "./xhtml.js";
import { createWriteStream } from "fs";
import archiver from "archiver"

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

export async function createEpub(metadata: Metadata, chapters: ChapterEpubItem[], items: EpubItem[], stagingPath: string, outPath: string) {
    await writeFile(join(stagingPath, "META-INF", "container.xml"), createContainerXML())
    await writeFile(join(stagingPath, "OEBPS", "content.opf"), createContentOPF(metadata, metadata.coverImage, chapters, items))
    await writeFile(join(stagingPath, "OEBPS", "toc.ncx"), createTocNCX(metadata, chapters))
    await writeFile(join(stagingPath, "OEBPS", "toc.xhtml"), createTOCXHTML(metadata, chapters))

    return zipDirectoryToEpub(stagingPath, outPath)
}

export async function zipDirectoryToEpub(stagingPath: string, outPath: string) {
    let output = await createWriteStream(outPath)
    let archive = archiver("zip", {
        zlib: {
            level: 9
        }
    })

    return new Promise((resolve, _) => {
        archive.append("application/epub+zip", {
            store: true,
            name: "mimetype"
        })
        archive.directory(join(stagingPath, "META-INF"), "META-INF")
        archive.directory(join(stagingPath, "OEBPS"), "OEBPS")

        archive.pipe(output)
        archive.on("end", () => resolve(true))
        archive.finalize()
    })
}