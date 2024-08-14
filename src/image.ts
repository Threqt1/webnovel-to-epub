import { Sharp } from "sharp";
import { ImageOptions } from "./structs.js";

export async function processImage(image: Sharp, options: ImageOptions) {
    let temp = image.webp({
        lossless: true,
        quality: options.quality,
    });

    if (options.shouldResize) {
        temp = temp.resize({
            width: options.maxWidth,
            height: options.maxHeight,
            fit: "inside",
        });
    }

    return temp;
}
