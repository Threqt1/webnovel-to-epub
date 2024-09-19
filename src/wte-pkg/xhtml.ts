import type { Chapter, EpubItem, Metadata } from "./structs.js";
import { v4 as uuidv4 } from "uuid";
import dateFormat, { masks } from "dateformat";

export function createChapterXHTML(chapter: Chapter): string {
    return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${chapter.title}</title>
</head>
<body>
    <h1>${chapter.title}</h1>
    ${chapter.content}
</body>
</html>`;
}

export function createContentOPF(
    metadata: Metadata,
    coverImage: EpubItem
): string {
    return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="1.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:opf="http://www.idpf.org/2007/opf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:identifier id="bookid">${uuidv4()}</dc:identifier>
    <dc:title>${metadata.title}</dc:title>
    <dc:language>en-US</dc:language>
    <dc:creator opf:role="aut">${metadata.author}</dc:creator>
    <meta content="${coverImage.id}" name="cover-image" />
  </metadata>
</package>
`;
}
