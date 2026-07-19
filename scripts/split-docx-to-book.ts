import { execa } from "execa";
import fs from "fs";
import fse from "fs-extra";
import path from "path";
import yaml from "yaml";

type PandocBlock = { t: string; c?: any };

type PandocDoc = {
  "pandoc-api-version": number[];
  meta: any;
  blocks: PandocBlock[];
};

type Chapter = {
  title: string;
  content: PandocBlock[];
};

type Part = {
  title: string;
  chapters: Chapter[];
};

async function docxToAst(docxPath: string, outDir: string): Promise<PandocDoc> {
  await fse.ensureDir(path.join(outDir, "assets"));

  const { stdout } = await execa(
    "pandoc",
    [docxPath, "-f", "docx", "-t", "json", "--extract-media=assets"],
    { cwd: outDir, maxBuffer: 1024 * 1024 * 50 }
  );

  return JSON.parse(stdout);
}

function normalize(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function inlineToText(inline: any): string {
  if (!inline) return "";

  switch (inline.t) {
    case "Str":
      return inline.c ?? "";
    case "Space":
    case "SoftBreak":
    case "LineBreak":
      return " ";
    case "Code":
    case "Math":
      return inline.c?.[1] ?? "";
    case "Strong":
    case "Emph":
    case "Underline":
    case "Strikeout":
    case "Superscript":
    case "Subscript":
    case "SmallCaps":
      return stringifyInlines(inline.c ?? []);
    case "Span":
    case "Quoted":
      return stringifyInlines(inline.c?.[1] ?? []);
    case "Link":
    case "Image":
      return stringifyInlines(inline.c?.[1] ?? []);
    default:
      return "";
  }
}

function stringifyInlines(inlines: any[]): string {
  return (inlines ?? []).map(inlineToText).join("");
}

function extractStructure(ast: PandocDoc): Part[] {
  const parts: Part[] = [];

  let currentPart: Part | null = null;
  let currentChapter: Chapter | null = null;

  for (const block of ast.blocks) {
    if (block.t === "Header") {
      const [level, , inlines] = block.c;
      const title = normalize(stringifyInlines(inlines));

      if (level === 1) {
        currentPart = { title, chapters: [] };
        parts.push(currentPart);
        currentChapter = null;
        continue;
      }

      if (level === 2) {
        if (!currentPart) {
          currentPart = { title: "@Frontmatter", chapters: [] };
          parts.push(currentPart);
        }

        currentChapter = { title, content: [] };
        currentPart.chapters.push(currentChapter);
        continue;
      }
    }

    if (currentChapter) currentChapter.content.push(block);
  }

  return parts;
}

function rewriteImageLinks(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g,
    (_m, alt, target, rest) => {
      if (
        /^https?:\/\//i.test(target) ||
        /^data:/i.test(target) ||
        target.startsWith("assets/")
      ) {
        return `![${alt}](${target}${rest})`;
      }

      const cleaned = target
        .replace(/^\.\//, "")
        .replace(/^(\.\.\/)+assets\//, "assets/");

      return `![${alt}](assets/${cleaned}${rest})`;
    }
  );
}

async function blocksToMarkdown(
  blocks: PandocBlock[],
  pandocApiVersion: number[]
) {
  const tmpDir = await fs.promises.mkdtemp(
    path.join(process.cwd(), ".tmp-pandoc-")
  );
  const tmpJson = path.join(tmpDir, "input.json");

  await fs.promises.writeFile(
    tmpJson,
    JSON.stringify({
      "pandoc-api-version": pandocApiVersion,
      meta: {},
      blocks,
    })
  );

  const { stdout } = await execa("pandoc", [
    tmpJson,
    "-f",
    "json",
    "-t",
    "markdown",
  ]);

  await fse.remove(tmpDir);

  return stdout.trim();
}

async function main() {
  const docxPathArg = process.argv[2];
  const destDirArg = process.argv[3];

  if (!docxPathArg) {
    console.error("Usage: npx tsx script.ts input.docx [destDir]");
    process.exit(1);
  }

  const docxPath = path.resolve(docxPathArg);
  const outDir = path.resolve(destDirArg ?? "book");

  await fse.ensureDir(outDir);
  await fse.ensureDir(path.join(outDir, "assets"));

  const ast = await docxToAst(docxPath, outDir);
  const parts = extractStructure(ast);

  // fallback: first part empty title → frontmatter
  if (parts.length > 0 && normalize(parts[0].title) === "") {
    parts[0].title = "@Frontmatter";
  }

  const bookYaml: any = {
    frontmatter: [],
    parts: [],
    backmatter: [],
  };

  let chapterCounter = 1;

  for (const part of parts) {
    const partTitle = normalize(part.title);
    const isFront = partTitle === "@Frontmatter";
    const isBack = partTitle === "@Backmatter";

    const partEntry = { title: part.title, items: [] as { file: string }[] };

    for (const chapter of part.chapters) {
      let mdBody = await blocksToMarkdown(
        chapter.content,
        ast["pandoc-api-version"]
      );

      mdBody = rewriteImageLinks(mdBody);

      // skip empty chapters
      if (mdBody.trim() === "") continue;

      const filename = `chapter-${chapterCounter
        .toString()
        .padStart(2, "0")}.md`;

      const filePath = path.join(outDir, filename);
      const finalMd = `# ${chapter.title}\n\n${mdBody}\n`;

      await fs.promises.writeFile(filePath, finalMd, "utf8");

      if (isFront) {
        bookYaml.frontmatter.push({ file: filename });
      } else if (isBack) {
        bookYaml.backmatter.push({ file: filename });
      } else {
        partEntry.items.push({ file: filename });
      }

      chapterCounter++;
    }

    if (!isFront && !isBack && partEntry.items.length > 0) {
      bookYaml.parts.push(partEntry);
    }
  }

  const bookYamlPath = path.join(outDir, "book.yaml");
  await fs.promises.writeFile(bookYamlPath, yaml.stringify(bookYaml), "utf8");

  console.log("✅ Done!");
  console.log(`book.yaml -> ${bookYamlPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


