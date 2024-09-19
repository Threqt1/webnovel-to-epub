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

export type Metadata = {
    title: string;
    author: string;
    coverImageURL: string;
};

export type Webnovel = {
    metadata: Metadata;
    chapters: Chapter[];
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

// export const SerializableWebnovelSchema = Yup.object().shape({
//     title: Yup.string().required(),
//     author: Yup.string().required(),
//     coverImageURL: Yup.string().url().required(),
//     chapters: Yup.array().of(
//         Yup.object().shape({
//             title: Yup.string().required(),
//             url: Yup.string().url().required(),
//             content: Yup.string().required(),
//             hasBeenParsed: Yup.boolean().required(),
//             hasBeenScraped: Yup.boolean().required(),
//         })
//     ),
// });

export enum ParsingType {
    WithImage,
    WithFormat,
}
