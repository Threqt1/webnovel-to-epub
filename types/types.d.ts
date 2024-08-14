declare module "puppeteer-real-browser" {
    export function connect(opts: {
        headless: "auto" | boolean;
        turnstile: boolean;
        fingerprint: boolean;
        customConfig: { executablePath: string };
    }): {
        page: any;
        browser: any;
        setTarget: (value: { status: boolean }) => void;
    };
}

declare module "epub-gen" {
    export default class Epub {
        promise: Promise<any>;
        constructor(
            options: {
                title: string;
                author: string;
                cover: string;
                content: { title: string; data: string }[];
                tocTitle: string;
            },
            path: string
        );
    }
}
