// scripts/build.ts
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import fse from "fs-extra";
import { execa } from "execa";

type BookYaml = {
  frontmatter?: Array<{ file: string }>;
  parts: Array<{
    title: string;
    items: Array<{ file: string }>;
  }>;
  backmatter?: Array<{ file: string }>;
};

type MetaYaml = {
  title: string;
  subtitle?: string;
  author: string;
  language?: string;
  "latex-language"?: string;
  rights?: string;
  publisher?: string;
  "toc-title"?: string;
  "copyright-page"?: string;

  // Optional (used by PDF / print)
  dedication?: string;

  // Optional (EPUB-only page after copyright)
  "dedication-ebook"?: string;
};

function readYaml<T>(filePath: string): T {
  const txt = fs.readFileSync(filePath, "utf8");
  return yaml.load(txt) as T;
}

function escapeYamlString(s: string): string {
  const needsQuotes = /[:\n"'#{}[\],&*?]|^\s|\s$/.test(s);
  if (!needsQuotes) return s;
  return JSON.stringify(s);
}

/**
 * Remove width=... and height=... from Pandoc image attribute blocks:
 *   ![](path){width="5in" height="2in"}
 * while preserving other attributes (classes, ids, etc).
 */
function stripImageSizeAttrs(md: string): string {
  return md.replace(/!\[[^\]]*]\([^)]+\)\{([^}]*)\}/g, (full, attrs) => {
    const cleaned = String(attrs)
      .split(/\s+/)
      .filter(Boolean)
      .filter((a) => !/^width=/.test(a) && !/^height=/.test(a))
      .join(" ")
      .trim();

    return cleaned.length
      ? full.replace(/\{[^}]*\}$/, `{${cleaned}}`)
      : full.replace(/\{[^}]*\}$/, "");
  });
}

/**
 * Returns:
 * - title: first H1 text
 * - body: markdown content with the first H1 removed (and any blank lines right after it)
 */
function extractTitleAndBody(filePath: string): { title: string; body: string } {
  const raw = fs.readFileSync(filePath, "utf8");
  let content = raw.replace(/\r\n/g, "\n");

  content = stripImageSizeAttrs(content);

  const lines = content.split("\n");

  let title: string | null = null;
  let titleLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)/);
    if (m) {
      title = m[1].trim();
      titleLineIdx = i;
      break;
    }
  }

  if (!title) {
    throw new Error(`No top-level (# ) heading found in ${filePath}`);
  }

  const bodyLines = lines.slice(titleLineIdx + 1);
  while (bodyLines.length > 0 && bodyLines[0].trim() === "") bodyLines.shift();

  return { title, body: bodyLines.join("\n").trimEnd() };
}

async function ensurePandocExists() {
  await execa("pandoc", ["--version"]);
}

function buildPandocMetadata(meta: MetaYaml, outPath: string) {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: ${escapeYamlString(meta.title)}`);
  if (meta.subtitle) lines.push(`subtitle: ${escapeYamlString(meta.subtitle)}`);
  lines.push(`author: ${escapeYamlString(meta.author)}`);
  if (meta.language) lines.push(`language: ${escapeYamlString(meta.language)}`);
  if (meta["latex-language"]) lines.push(`latex-language: ${escapeYamlString(meta["latex-language"])}`);
  if (meta.rights) lines.push(`rights: ${escapeYamlString(meta.rights)}`);
  if (meta.publisher) lines.push(`publisher: ${escapeYamlString(meta.publisher)}`);
  if (meta["toc-title"]) lines.push(`toc-title: ${escapeYamlString(meta["toc-title"])}`);

  if (meta["copyright-page"]) {
    lines.push(`copyright-page: |`);
    for (const l of meta["copyright-page"].replace(/\r\n/g, "\n").split("\n")) {
      lines.push(`  ${l}`);
    }
  }

  if (meta.dedication) {
    lines.push(`dedication: |`);
    for (const l of meta.dedication.replace(/\r\n/g, "\n").split("\n")) {
      lines.push(`  ${l}`);
    }
  }

  lines.push("---");
  lines.push("");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

/**
 * bookDir-hez képest értelmezzük a book.yaml-ban lévő file mezőket.
 */
function resolveBookFile(bookDir: string, fileRef: string): string {
  return path.isAbsolute(fileRef) ? fileRef : path.join(bookDir, fileRef);
}

function buildCombinedMarkdown(book: BookYaml, bookDir: string, outPath: string, mode: "epub" | "pdf") {
  const lines: string[] = [];

  if (mode === "pdf") {
    lines.push("```{=latex}");
    lines.push("\\frontmatter");
    lines.push("\\tableofcontents");
    lines.push("```");
    lines.push("");
  }

  if (book.frontmatter?.length) {
    for (const fm of book.frontmatter) {
      const fmPath = resolveBookFile(bookDir, fm.file);
      const { title: fmTitle, body: fmBody } = extractTitleAndBody(fmPath);

      lines.push(`# ${fmTitle}`);
      lines.push("");
      if (fmBody.length) {
        lines.push(fmBody);
        lines.push("");
      }
    }
  }

  if (mode === "pdf") {
    lines.push("```{=latex}");
    lines.push("\\mainmatter");
    lines.push("```");
    lines.push("");
  }

  for (const part of book.parts) {
    if (mode === "pdf") {
      lines.push("```{=latex}");
      const safe = part.title.replace(/([{}])/g, "\\$1");
      lines.push(`\\part{${safe}}`);
      lines.push("```");
      lines.push("");
    } else {
      lines.push(`# ${part.title}`);
      lines.push("");
    }

    for (const ch of part.items) {
      const chPath = resolveBookFile(bookDir, ch.file);
      const { title: chapterTitle, body: chapterBody } = extractTitleAndBody(chPath);

      if (mode === "epub") {
        lines.push(`## ${chapterTitle}`);
        lines.push("");
      } else {
        lines.push(`# ${chapterTitle}`);
        lines.push("");
      }

      if (chapterBody.length) {
        lines.push(chapterBody);
        lines.push("");
      }
    }
  }

  if (book.backmatter?.length) {
    if (mode === "pdf") {
      lines.push("```{=latex}");
      lines.push("\\backmatter");
      lines.push("```");
      lines.push("");
    }

    for (const bm of book.backmatter) {
      const bmPath = resolveBookFile(bookDir, bm.file);
      const { title: bmTitle, body: bmBody } = extractTitleAndBody(bmPath);

      lines.push(`# ${bmTitle}`);
      lines.push("");

      if (bmBody.length) {
        lines.push(bmBody);
        lines.push("");
      }
    }
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function buildEpubTitlePage(meta: MetaYaml, outPath: string) {
  const author = meta.author ?? "";
  const title = meta.title ?? "";
  const subtitle = meta.subtitle ?? "";

  const lines: string[] = [];

  lines.push(`# ${title} {.unnumbered .unlisted .tp-hidden}`);
  lines.push("");

  lines.push("```{=html}");
  lines.push('<section class="titlepage" epub:type="titlepage">');
  lines.push(`  <div class="tp-author">${author}</div>`);
  lines.push(`  <div class="tp-title">${title}</div>`);
  if (subtitle) lines.push(`  <div class="tp-subtitle">${subtitle}</div>`);
  lines.push("</section>");
  lines.push("```");
  lines.push("");

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function buildEpubCopyrightPage(meta: MetaYaml, outPath: string) {
  if (!meta["copyright-page"]) return;

  const lines: string[] = [];

  lines.push(`# Copyright {.unnumbered .unlisted}`);
  lines.push("");

  lines.push("```{=html}");
  lines.push('<section class="copyright-page">');
  lines.push("```");
  lines.push("");

  lines.push(meta["copyright-page"]);
  lines.push("");

  lines.push("```{=html}");
  lines.push("</section>");
  lines.push("```");
  lines.push("");

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function buildEpubDedicationPage(meta: MetaYaml, outPath: string) {
  if (!meta["dedication-ebook"]) return;

  const lines: string[] = [];

  lines.push(`# Dedication {.unnumbered .unlisted .tp-hidden}`);
  lines.push("");

  lines.push("```{=html}");
  lines.push('<section class="ebook-dedication-page">');
  lines.push("```");
  lines.push("");

  lines.push(meta["dedication-ebook"]);
  lines.push("");

  lines.push("```{=html}");
  lines.push("</section>");
  lines.push("```");
  lines.push("");

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function getBookDirFromArgs(): string {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: yarn build <bookDir>");
    process.exit(1);
  }
  return path.resolve(process.cwd(), arg);
}

function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const toolRoot = process.cwd();
  const bookDir = getBookDirFromArgs();

  const bookPath = path.join(bookDir, "book.yaml");
  const metaPath = path.join(bookDir, "meta.yaml");

  const distDir = path.join(toolRoot, "dist");
  const templatesDir = path.join(toolRoot, "templates");
  const assetsDir = path.join(bookDir, "assets");

  const epubCss = path.join(templatesDir, "epub.css");
  const printTemplate = path.join(templatesDir, "print-template.tex");
  const coverImage = path.join(assetsDir, "cover.png");

  const italicFilter = path.join(toolRoot, "filters", "italic.lua");
  const dropcapFilter = path.join(toolRoot, "filters", "dropcap.lua");
  const removeTitleH1Filter = path.join(toolRoot, "filters", "remove_first_title_h1.lua");

  if (!fs.existsSync(bookPath)) throw new Error(`Missing book.yaml: ${bookPath}`);
  if (!fs.existsSync(metaPath)) throw new Error(`Missing meta.yaml: ${metaPath}`);
  if (!fs.existsSync(assetsDir)) throw new Error(`Missing assets dir: ${assetsDir}`);
  if (!fs.existsSync(coverImage)) throw new Error(`Missing cover image: ${coverImage}`);
  if (!fs.existsSync(epubCss)) throw new Error(`Missing template css: ${epubCss}`);
  if (!fs.existsSync(printTemplate)) throw new Error(`Missing print template: ${printTemplate}`);

  await ensurePandocExists();
  await fse.ensureDir(distDir);

  const book = readYaml<BookYaml>(bookPath);
  const meta = readYaml<MetaYaml>(metaPath);

  const dedicationPath = path.join(bookDir, "dedication.md");
  if (fs.existsSync(dedicationPath)) {
    meta.dedication = fs.readFileSync(dedicationPath, "utf8").replace(/\r\n/g, "\n").trim();
  }

  const metaOut = path.join(distDir, "_meta.md");
  buildPandocMetadata(meta, metaOut);

  const epubTitlePage = path.join(distDir, "_titlepage.epub.md");
  buildEpubTitlePage(meta, epubTitlePage);

  const epubCopyright = path.join(distDir, "_copyright.epub.md");
  buildEpubCopyrightPage(meta, epubCopyright);

  const epubDedication = path.join(distDir, "_dedication_ebook.epub.md");
  buildEpubDedicationPage(meta, epubDedication);

  const epubMaster = path.join(distDir, "_master.epub.md");
  const pdfMaster = path.join(distDir, "_master.pdf.md");
  buildCombinedMarkdown(book, bookDir, epubMaster, "epub");
  buildCombinedMarkdown(book, bookDir, pdfMaster, "pdf");

  const safeTitle = slugifyTitle(meta.title);
  const epubOut = path.join(distDir, `${safeTitle}.epub`);
  const pdfOut = path.join(distDir, `${safeTitle}.pdf`);

  const resourcePath = `${bookDir}:${path.join(bookDir, "assets")}`;

  await execa(
    "pandoc",
    [
      "-f",
      "markdown+smart",
      metaOut,
      epubTitlePage,
      epubCopyright,
      epubDedication,
      epubMaster,

      "--resource-path",
      resourcePath,

      "--lua-filter",
      removeTitleH1Filter,
      "--lua-filter",
      italicFilter,
      "--toc",
      "--toc-depth=2",
      "--split-level=2",
      "--epub-title-page=false",
      "--css",
      epubCss,
      "--epub-cover-image",
      coverImage,
      "-o",
      epubOut,
    ],
    { stdio: "inherit" }
  );

  await execa(
    "pandoc",
    [
      "-f",
      "markdown+smart",
      metaOut,
      pdfMaster,

      "--resource-path",
      resourcePath,

      "--lua-filter",
      italicFilter,
      "--lua-filter",
      dropcapFilter,
      "--pdf-engine=xelatex",
      "--top-level-division=chapter",
      "--template",
      printTemplate,
      "-o",
      pdfOut,
    ],
    { stdio: "inherit" }
  );

  /*
    const texOut = path.join(distDir, "_debug.tex");
  
    // DEBUG TEX GENERÁLÁS
    await execa(
      "pandoc",
      [
        "-f",
        "markdown+smart",
  
        metaOut,
        pdfMaster,
  
        "--resource-path",
        resourcePath,
  
        "--lua-filter",
        italicFilter,
  
        "--lua-filter",
        dropcapFilter,
  
        "--top-level-division=chapter",
  
        "--template",
        printTemplate,
  
        "-s",
  
        "-o",
        texOut,
      ],
      { stdio: "inherit" }
    );
  */

  console.log("\n✅ Done:");
  console.log(`Book dir: ${bookDir}`);
  console.log(`EPUB: ${epubOut}`);
  console.log(`PDF : ${pdfOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});