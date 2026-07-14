import type { ClassPresentation, PresentationSlide } from "@/lib/presentations/types";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SLIDE_WIDTH = 12192000;
const SLIDE_HEIGHT = 6858000;

type ZipEntry = { path: string; data: Buffer };
type SlideExport = {
    slide: PresentationSlide;
    image?: {
        relId: string;
        mediaPath: string;
        fileName: string;
        contentType: string;
        extension: string;
        data: Buffer;
    };
};

const escapeXml = (value: string | number | undefined) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

const sanitizeColor = (color?: string, fallback = "1A1A1A") => {
    const value = (color || fallback).replace("#", "").trim();
    return /^[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
};

function crc32(buffer: Buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
    return {
        dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
}

function createZip(entries: ZipEntry[]) {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;
    const { dosTime, dosDate } = dosDateTime();
    for (const entry of entries) {
        const fileName = Buffer.from(entry.path, "utf8");
        const checksum = crc32(entry.data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt16LE(dosTime, 10);
        local.writeUInt16LE(dosDate, 12);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(entry.data.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(fileName.length, 26);
        localParts.push(local, fileName, entry.data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0, 8);
        central.writeUInt16LE(0, 10);
        central.writeUInt16LE(dosTime, 12);
        central.writeUInt16LE(dosDate, 14);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(entry.data.length, 20);
        central.writeUInt32LE(entry.data.length, 24);
        central.writeUInt16LE(fileName.length, 28);
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, fileName);
        offset += local.length + fileName.length + entry.data.length;
    }
    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, centralDirectory, end]);
}

const xmlEntry = (path: string, xml: string): ZipEntry => ({ path, data: Buffer.from(`${XML_DECLARATION}\n${xml}`, "utf8") });

function textShape(id: number, name: string, text: string, x: number, y: number, cx: number, cy: number, size = 1600, bold = false) {
    const paragraphs = text.split(/\r?\n/).filter(Boolean).map(line =>
        `<a:p><a:r><a:rPr lang="pt-BR" sz="${size}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>${escapeXml(line)}</a:t></a:r></a:p>`
    ).join("");
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${paragraphs || "<a:p/>"}</p:txBody></p:sp>`;
}

function rectShape(id: number, fill: string, x = 0, y = 0, cx = SLIDE_WIDTH, cy = SLIDE_HEIGHT) {
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Fundo"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${sanitizeColor(fill)}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
}

function imageShape(id: number, relId: string) {
    return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Fundo da apresentacao"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></p:spPr></p:pic>`;
}

function parseBackgroundImage(slide: PresentationSlide, index: number): SlideExport["image"] | undefined {
    const dataUrl = slide.backgroundImage?.dataUrl;
    if (!dataUrl) return undefined;
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) return undefined;
    const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    return {
        relId: "rId1",
        mediaPath: `ppt/media/background${index + 1}.${extension}`,
        fileName: `background${index + 1}.${extension}`,
        contentType: mimeType,
        extension,
        data: Buffer.from(match[2], "base64"),
    };
}

function slideBody(slide: PresentationSlide) {
    const parts = [slide.content.subtitle, slide.content.body, slide.content.notes].filter(Boolean) as string[];
    if (slide.content.indicators?.length) {
        parts.push(...slide.content.indicators.map(item => `${item.name}: ${item.value}${item.percent !== undefined ? ` (${item.percent}%)` : ""}`));
    }
    if (slide.content.processes?.length) {
        parts.push(...slide.content.processes.map(item => [item.process, item.object, item.situation, item.responsible, item.pending, item.nextStep].filter(Boolean).join(" | ")));
    }
    if (slide.content.alert) {
        parts.push(`Fato: ${slide.content.alert.fact}`, `Impacto: ${slide.content.alert.impact}`, `Risco: ${slide.content.alert.risk}`, `Providencia: ${slide.content.alert.action}`, `Decisao: ${slide.content.alert.decisionRequired}`);
    }
    if (slide.content.table) {
        parts.push(slide.content.table.columns.join(" | "));
        parts.push(...slide.content.table.rows.slice(0, 8).map(row => row.join(" | ")));
        parts.push(`Fonte: ${slide.content.table.provenance.sourceLabel}`);
    }
    if (slide.content.chart) {
        parts.push(...slide.content.chart.data.map(item => `${item.label}: ${item.value}${item.percent !== undefined ? ` (${item.percent}%)` : ""}`));
        parts.push(`Fonte: ${slide.content.chart.provenance.sourceLabel}`);
    }
    return parts.join("\n");
}

function slideXml(entry: SlideExport) {
    const { slide, image } = entry;
    const background = image ? imageShape(2, image.relId) : rectShape(2, slide.backgroundColor);
    return `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${background}${textShape(3, "Titulo", slide.content.title || slide.title, 650000, 430000, 10800000, 700000, 3000, true)}${textShape(4, "Conteudo", slideBody(slide), 800000, 1450000, 10600000, 4300000, 1550)}${slide.showFooter ? textShape(5, "Rodape", `${slide.classIdentification} | ${slide.referenceDate || ""} | ${slide.dataSource || ""}`, 800000, 6250000, 10600000, 260000, 1000) : ""}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function contentTypes(slideCount: number, imageExtensions: string[]) {
    const slides = Array.from({ length: slideCount }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
    const imageDefaults = Array.from(new Set(imageExtensions)).map(extension => {
        const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
        return `<Default Extension="${extension}" ContentType="${contentType}"/>`;
    }).join("");
    return `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefaults}<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides}</Types>`;
}

function presentationXml(slideCount: number) {
    const slideIds = Array.from({ length: slideCount }, (_, index) => `<p:sldId id="${index + 256}" r:id="rId${index + 2}"/>`).join("");
    return `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function presentationRels(slideCount: number) {
    const rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>', ...Array.from({ length: slideCount }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)].join("");
    return `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

const emptyRels = () => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>';
const slideRels = (image?: SlideExport["image"]) => image
    ? `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${image.fileName}"/></Relationships>`
    : emptyRels();
const rootRels = () => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
const slideMasterXml = () => '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>';
const slideLayoutXml = () => '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>';
const themeXml = () => '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SONAR"><a:themeElements><a:clrScheme name="SONAR"><a:dk1><a:srgbClr val="1A1A1A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="111827"/></a:dk2><a:lt2><a:srgbClr val="FDFBF7"/></a:lt2><a:accent1><a:srgbClr val="FFB000"/></a:accent1><a:accent2><a:srgbClr val="2563EB"/></a:accent2><a:accent3><a:srgbClr val="059669"/></a:accent3><a:accent4><a:srgbClr val="DC2626"/></a:accent4><a:accent5><a:srgbClr val="64748B"/></a:accent5><a:accent6><a:srgbClr val="0F172A"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="SONAR"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="SONAR"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';

export function generatePptx(presentation: ClassPresentation) {
    const slides = presentation.slides.filter(slide => !slide.isHidden).sort((a, b) => a.position - b.position);
    const visibleSlides = slides.length > 0 ? slides : [{
        id: "slide-empty-export",
        presentationId: presentation.id,
        title: presentation.title,
        slideType: "branco",
        position: 1,
        content: {
            title: presentation.title,
            body: "Apresentacao exportada sem slides visiveis.",
        },
        isHidden: false,
        publishToMonitor: false,
        monitorDuration: 12,
        backgroundColor: "#1A1A1A",
        showFooter: true,
        classIdentification: presentation.classKey,
        referenceDate: presentation.presentationDate,
        dataSource: presentation.context,
        updatedAt: presentation.updatedAt,
    } satisfies PresentationSlide];
    const slideCount = visibleSlides.length;
    const slideExports: SlideExport[] = visibleSlides.map((slide, index) => ({
        slide,
        image: parseBackgroundImage(slide, index),
    }));
    const imageEntries = slideExports
        .map(entry => entry.image)
        .filter((image): image is NonNullable<SlideExport["image"]> => Boolean(image))
        .map(image => ({ path: image.mediaPath, data: image.data }));

    return createZip([
        xmlEntry("[Content_Types].xml", contentTypes(slideCount, slideExports.map(entry => entry.image?.extension).filter((extension): extension is string => Boolean(extension)))),
        xmlEntry("_rels/.rels", rootRels()),
        xmlEntry("docProps/core.xml", `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(presentation.title)}</dc:title><dc:creator>${escapeXml(presentation.responsible)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(presentation.createdAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(presentation.updatedAt)}</dcterms:modified></cp:coreProperties>`),
        xmlEntry("docProps/app.xml", `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SONAR</Application><Slides>${slideCount}</Slides></Properties>`),
        xmlEntry("ppt/presentation.xml", presentationXml(slideCount)),
        xmlEntry("ppt/_rels/presentation.xml.rels", presentationRels(slideCount)),
        xmlEntry("ppt/slideMasters/slideMaster1.xml", slideMasterXml()),
        xmlEntry("ppt/slideMasters/_rels/slideMaster1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'),
        xmlEntry("ppt/slideLayouts/slideLayout1.xml", slideLayoutXml()),
        xmlEntry("ppt/slideLayouts/_rels/slideLayout1.xml.rels", emptyRels()),
        xmlEntry("ppt/theme/theme1.xml", themeXml()),
        ...slideExports.map((entry, index) => xmlEntry(`ppt/slides/slide${index + 1}.xml`, slideXml(entry))),
        ...slideExports.map((entry, index) => xmlEntry(`ppt/slides/_rels/slide${index + 1}.xml.rels`, slideRels(entry.image))),
        ...imageEntries,
    ]);
}

export function pptxFileName(title: string) {
    const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return `${slug || "apresentacao-sonar"}.pptx`;
}
