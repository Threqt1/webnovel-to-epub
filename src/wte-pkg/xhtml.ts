import type { Chapter, ChapterEpubItem, EpubItem, Metadata } from "./structs.js";

export function createContainerXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>    </rootfiles>
</container>`
}

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
  coverImage: EpubItem | undefined,
  chapters: ChapterEpubItem[],
  items: EpubItem[],
): string {
  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="1.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:opf="http://www.idpf.org/2007/opf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:identifier id="bookid">${metadata.id}</dc:identifier>
    <dc:title>${metadata.title}</dc:title>
    <dc:language>en-US</dc:language>
    <dc:creator opf:role="aut">${metadata.author}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta> 
    ${coverImage ? `<meta content="${coverImage.id}" name="cover-image" />` : ``}
  </metadata>
  <manifest>
    ${items.filter(r => coverImage ? r.id !== coverImage.id : true).map(item => `<item id="${item.id}" media-type="${item.type}" href="${item.path}" />`).join("\n")}
    ${coverImage ? `<item id="${coverImage.id}" properties="cover-image" href="${coverImage.path}" media-type="${coverImage.type}" />` : ``}
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="ncx" media-type="application/x-dtbncx+xml" href="toc.ncx" />
  </manifest>
  <spine toc="ncx">
  <itemref idref="toc" />
  ${chapters.map(r => `<itemref idref="${r.id}" />`).join("\n")}
  </spine>
</package>
`;
}

export function createTocNCX(
  metada: Metadata,
  chapters: ChapterEpubItem[],
): string {
  return `<?xml version='1.0' encoding='utf-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="en">
  <head>
  <meta content="${metada.id}" name="dtb:uid"/>
  <meta content="1" name="dtb:depth"/>
  <meta content="0" name="dtb:totalPageCount"/>
  <meta content="0" name="dtb:maxPageNumber"/>
  </head>
  <docTitle>
  <text>${metada.title}</text>
  </docTitle>
  <navMap>
    ${chapters.map((r, i) => `<navPoint id="c_${i}" playOrder="${i}">
      <navLabel>
      <text>${r.title}</text>
      </navLabel>
      <content src="${r.path}" />
      </navPoint>`).join("\n")}
  </navMap>
</ncx>`
}

export function createTOCXHTML(
  metadata: Metadata,
  chapters: ChapterEpubItem[]
): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <!DOCTYPE html>
  <head>
    <title>${metadata.title}</title>
  </head>
  <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
    <nav id="toc" epub:type="toc">
      <ol>
        ${chapters.map(r => `<li>
            <a href=${r.path}>${r.title}</a>
          </li>`).join("\n")}
      </ol>
    </nav>
  </html>`
}