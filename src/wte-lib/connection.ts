import { join } from "path";
import puppeteer from "puppeteer-core";
import { PUPPETEER_REVISIONS } from "puppeteer-core/lib/cjs/puppeteer/revisions.js";
import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";
import { TEMP_FILE_PATH } from "./strings.js";

export async function makeNewConnection(): Promise<ConnectResult> {
    const { connect } = await import("puppeteer-real-browser");
    const { findChrome } = await import("find-chrome-bin");
    let chromePath = (
        await findChrome({
            min: 110,
            download: {
                puppeteer,
                path: join(TEMP_FILE_PATH, "chrome"),
                revision: PUPPETEER_REVISIONS.chrome,
            },
        })
    ).executablePath;
    const connection = await connect({
        turnstile: true,
        customConfig: {
            chromePath,
        },
    });
    await setupPage(connection.page);
    return connection;
}

export async function createNewPage(
    connection: ConnectResult,
    allowImg: boolean = true
): Promise<PageWithCursor> {
    let newPage = (await connection.browser.newPage()) as PageWithCursor;
    await setupPage(newPage, allowImg);
    return newPage;
}

async function setupPage(
    page: PageWithCursor,
    allowImg: boolean = true
): Promise<void> {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
        if (
            req.resourceType() === "stylesheet" ||
            req.resourceType() === "font" ||
            (!allowImg && req.resourceType() === "media")
        ) {
            req.abort();
        } else {
            req.continue();
        }
    });
}
