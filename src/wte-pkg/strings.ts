import { join } from "path";

export const TEMP_FILE_PATH = join(import.meta.dirname, ".", "temp");

export const ERRORS = {
    ScraperNotFound: (url: string) => `Scraper not found for url ${url}`,
    FailedToScrape: (url: string) => `Failed to scrape chapter ${url}`,
    FailedToParse: (url: string) => `Failed to parse chapter ${url}`,
};
