import { join } from "path";

export const TEMP_FILE_PATH = join(import.meta.dirname, ".", "temp");
export const EPUB_ITEM_TYPES = {
    img: (extension: string) => `image/${extension}`,
};
export const METADATA_FILE_NAME = "wte.json";

export const ERRORS = {
    ScraperNotFound: (url: string) => `Scraper not found for url ${url}`,
    FailedToScrape: (url: string) => `Failed to scrape chapter ${url}`,
    FailedToParse: (url: string) => `Failed to parse chapter ${url}`,
    InvalidEpub: (path: string) =>
        `Epub isn't a WTE-managed epub. Try parsing this novel with WTE first. Epub at path ${path}`,
};
