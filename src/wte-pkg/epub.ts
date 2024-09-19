import { mkdir } from "fs/promises";
import { join } from "path";

/*
META-INF
    container.xml
OEBPS
    Fonts
    Images
    Text
    content.opf
    toc.ncx
*/
export const IMAGE_DIR = "Images";
export const TEXT_DIR = "Text";
export const FONT_DIR = "Fonts";

export async function createStagingDirectory(basePath: string) {
    await mkdir(basePath);
    await mkdir(join(basePath, "META-INF"));
    await mkdir(join(basePath, "OEBPS"));
    await mkdir(join(basePath, "OEBPS", FONT_DIR));
    await mkdir(join(basePath, "OEBPS", IMAGE_DIR));
    await mkdir(join(basePath, "OEBPS", TEXT_DIR));
}
