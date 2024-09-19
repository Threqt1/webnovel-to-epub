import { Scraper } from "./baseScraper.js";
import NoveloonScraper from "./noveloon.js";
import WoopreadScraper from "./woopread.js";

const ALL_SCRAPERS: Scraper[] = [new WoopreadScraper(), new NoveloonScraper()];

export function findCorrectScraper(url: string): Scraper | undefined {
    return ALL_SCRAPERS.find((scraper) => scraper.matchUrl(url));
}
