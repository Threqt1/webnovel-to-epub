import { Scraper } from "./baseScraper.js";
import NovelbinMeScraper from "./novelbinme.js";
import NoveloonComScraper from "./novelooncom.js";
import WoopreadComScraper from "./woopreadcom.js";

const ALL_SCRAPERS: Scraper[] = [new WoopreadComScraper(), new NoveloonComScraper(), new NovelbinMeScraper()];

export function findCorrectScraper(url: string): Scraper | undefined {
    return ALL_SCRAPERS.find((scraper) => scraper.matchUrl(url));
}
