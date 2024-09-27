import type { ConnectResult, PageWithCursor } from "puppeteer-real-browser";

export async function makeNewConnection(): Promise<ConnectResult> {
    const { connect } = await import("puppeteer-real-browser");
    const connection = await connect({
        turnstile: true,
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
