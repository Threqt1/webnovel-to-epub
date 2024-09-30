import * as Yup from "yup";

export type ChapterSkeleton = {
    index: number;
    title: string;
    url: string;
};

export type Chapter = ChapterSkeleton & {
    content: string;
};

export type EpubItem = {
    id: string;
    path: string;
    type: string;
};

export type ChapterEpubItem = EpubItem & {
    index: number;
    title: string;
    url: string;
};

export type Metadata = {
    title: string;
    author: string;
    coverImage?: EpubItem;
    id: string;
    tocUrls: string[];
};

export type Webnovel = {
    metadata: Metadata;
    chapters: ChapterEpubItem[];
    items: EpubItem[];
};

export type ScrapingOptions = {
    concurrency: number;
    timeout: number;
};

export type ImageOptions = {
    quality: number;
    webp: boolean;
    shouldResize: boolean;
    maxWidth: number;
    maxHeight: number;
};

export const JSONSchema = Yup.object().shape({
    metadata: Yup.object()
        .shape({
            title: Yup.string().required(),
            author: Yup.string().required(),
            coverImage: Yup.object().shape({
                id: Yup.string().required(),
                path: Yup.string().required(),
                type: Yup.string().required(),
            }),
            id: Yup.string().required(),
            tocUrls: Yup.array().of(Yup.string()).required()
        })
        .required(),
    chapters: Yup.array()
        .of(
            Yup.object().shape({
                type: Yup.string().required(),
                id: Yup.string().required(),
                path: Yup.string().required(),
                index: Yup.number().integer().required(),
                title: Yup.string().required(),
                url: Yup.string().url().required(),
            })
        )
        .required(),
    items: Yup.array()
        .of(
            Yup.object().shape({
                type: Yup.string().required(),
                id: Yup.string().required(),
                path: Yup.string().required(),
            })
        )
        .required(),
});

export enum ParsingType {
    WithImage,
    WithFormat,
}
