import { Browser, Page } from "puppeteer-core";

export interface Chapter {
    title: string;
    url: string;
    hasBeenScraped: boolean;
    hasBeenParsed: boolean;
    content: string;
}

export type Webnovel = {
    title: string;
    author: string;
    coverImageURL: string;
    chapters: Chapter[];
};

export type ConnectionInfo = {
    page: Page;
    browser: Browser;
    setTarget: (value: { status: boolean }) => void;
};

export type ScrapingOptions = {
    concurrency: number;
    timeout: number;
};

export type ImageOptions = {
    quality: number;
    shouldResize: boolean;
    maxWidth: number;
    maxHeight: number;
};

export type FileSystemOptions = {
    path: string;
};

export const SerializableWebnovelSchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        author: { type: "string" },
        coverImageURL: { type: "string" },
        chapters: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    content: { type: "string" },
                    hasBeenParsed: { type: "boolean" },
                    hasBeenScraped: { type: "boolean" },
                },
            },
        },
    },
};

export enum ParsingType {
    WithImage,
    WithFormat,
    TextOnly,
}
