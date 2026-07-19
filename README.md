# PubDown

**PubDown** is a developer-friendly publishing tool for building professional-quality **PDF** and **EPUB** books from Markdown.

It is built on top of [**Pandoc**](https://pandoc.org/), but adds an opinionated project structure, automatic book assembly, EPUB/PDF templates, and utilities for converting existing DOCX manuscripts into Markdown projects.

## Why PubDown?

Pandoc is arguably the best document conversion tool ever created. It can convert between dozens of formats and serves as the foundation of countless publishing workflows.

However, writing an entire book directly with Pandoc quickly becomes cumbersome. You have to manually organize chapters, manage metadata, assemble front matter, configure EPUB and PDF generation separately, maintain templates, and repeatedly invoke long Pandoc commands.

PubDown was created to solve exactly these problems.

Instead of being yet another Markdown flavor, PubDown is a lightweight publishing framework built on top of Pandoc. It provides a clean project structure and automates the repetitive parts of book publishing while keeping the full power of Pandoc available underneath.

With PubDown you can:

- write each chapter as a separate Markdown file
- organize books into parts
- manage front matter and back matter
- generate professional PDF and EPUB editions from the same source (ready for **Amazon KDP**, **Google Play Books**, **Apple Books**, **Lulu**, etc.)
- import existing DOCX manuscripts
- keep everything under version control with Git

The result is a workflow that is simple enough for individual authors, yet powerful enough for technical books, documentation and professional publishing.

If you already know Markdown and Pandoc, you'll feel at home immediately.
If you don't, PubDown gives you a much easier starting point than learning raw Pandoc publishing from scratch.

## Features

- 📚 Build complete books from Markdown
- 📖 Generate both **PDF** and **EPUB**
- 🎨 Beautiful print template (XeLaTeX)
- 📱 EPUB with custom title page, cover, CSS and navigation
- 🖼 Automatic image handling
- ✍️ Lua filters for typography (drop caps, italics, etc.)
- 🧩 Multi-part books
- 📑 Front matter / main matter / back matter support
- 📥 Import Word (.docx) books into Markdown

## Installation

Requirements:

- Node.js 20+
- Yarn
- Pandoc
- XeLaTeX (for PDF generation)

Clone the repository:

```bash
git clone https://github.com/TheBojda/PubDown.git
cd pubdown

yarn install
```

## Project structure

A book project looks like this:

```text
my-book/
│
├── assets/
│   ├── cover.png
│   └── images...
│
├── meta.yaml
├── book.yaml
│
├── chapter-01.md
├── chapter-02.md
├── chapter-03.md
│
└── dedication.md
```

## book.yaml

The `book.yaml` file defines the logical structure and organization of the book's content. It maps the markdown source files into specific sections like frontmatter, main parts with chapters, and backmatter.

### Structure Fields

*   **`frontmatter`** *(List of Objects, Optional)*: Defines the introductory files of the book (e.g., Foreword, Preface, Introduction). Each item requires a `file` path.
*   **`parts`** *(List of Objects, Required)*: The main body of the book, broken down into structural parts. 
    *   **`title`** *(String)*: The name of the part.
    *   **`items`** *(List of Objects)*: The collection of chapters belonging to this part. Each item requires a `file` path.
*   **`backmatter`** *(List of Objects, Optional)*: Defines the concluding sections of the book (e.g., Acknowledgements, Appendix, Afterword). Each item requires a `file` path.

### Item Properties

*   **`file`** *(String, Required)*: The relative or absolute path to the Markdown (`.md`) file containing the content for that specific chapter.

> **Note on Content Structure:** Each Markdown file linked in the YAML must start with a top-level (`# `) heading, which the build script uses to extract the title of that section or chapter.

### Example

```yaml
frontmatter:
  - file: foreword.md

parts:
  - title: Part I
    items:
      - file: chapter-01.md
      - file: chapter-02.md

  - title: Part II
    items:
      - file: chapter-03.md

backmatter:
  - file: acknowledgements.md
```

## meta.yaml

The `meta.yaml` file defines the metadata of the book used during the build process to generate document headers, title pages, copyright notices, and formatting options for both EPUB and PDF outputs.

### Global Metadata Fields

*   **`title`** *(String, Required)*: The main title of the book.
*   **`subtitle`** *(String, Optional)*: The subtitle of the book, which appears on the title page.
*   **`author`** *(String, Required)*: The name of the author(s).
*   **`language`** *(String, Optional)*: The primary language of the document (e.g., `en`), passed to Pandoc.
*   **`latex-language`** *(String, Optional)*: The language parameter specifically used by the LaTeX engine for hyphenation and typesetting rules (e.g., `english`).
*   **`rights`** *(String, Optional)*: A short copyright notice line (e.g., `© 2026 László Fazekas`).
*   **`publisher`** *(String, Optional)*: The name of the publisher.
*   **`toc-title`** *(String, Optional)*: The custom title for the Table of Contents page (e.g., `Table of Contents`).

### Layout & Page Content Fields

*   **`copyright-page`** *(Block Scalar / Multi-line Text, Optional)*: The complete legal notice and licensing information text.
*   **`dedication`** *(Block Scalar / Multi-line Text, Optional)*: The dedication text used primarily by the PDF/print layout engine. *Note: If a `dedication.md` file is present in the book directory, its content will automatically populate this field at runtime.*
*   **`dedication-ebook`** *(Block Scalar / Multi-line Text, Optional)*: An EPUB-exclusive multi-line section placed immediately after the copyright page. This is ideal for tailored notes, calls-to-action, or links meant specifically for digital readers.

### Example

```yaml
title: "Simulated Reality"
subtitle: "An Exciting Journey into the World of Quantum Mechanics, Brain-Machine Interfaces, and Transhumanism"
toc-title: "Table of Contents"
author: "László Fazekas"
language: en
latex-language: english
rights: "© 2026 László Fazekas"
copyright-page: |
  Copyright © 2026 by László Fazekas

  All rights reserved. No part of this publication may be reproduced...
dedication: |
  I am grateful to my family...
dedication-ebook: |
  Dear Reader,

  Simulated Reality is my first book. Thank you for downloading this eBook...
```

## Building a book

Build both formats:

```bash
./pubdown.sh build my-book
```

Generate only PDF:

```bash
./pubdown.sh build my-book \
    --format pdf
```

Generate only EPUB:

```bash
./pubdown.sh build my-book \
    --format epub
```

Output:

```
dist/

    simulated-reality.pdf
    simulated-reality.epub
```

## Importing an existing DOCX

PubDown can split an existing Word manuscript into a complete Markdown project.

```bash
tsx scripts/split-docx-to-book.ts \
    manuscript.docx \
    my-book
```

The importer:

- extracts images
- creates chapter Markdown files
- generates `book.yaml`
- preserves document hierarchy
- rewrites image links automatically

## Markdown

Each chapter starts with a single H1 heading.

Example:

```markdown
# Chapter title

Chapter text...

## Section

More text...
```

The H1 is used as the chapter title and is removed automatically from the body when generating the final book.

---

## PDF generation

PDF output uses:

- Pandoc
- XeLaTeX
- custom print template
- Lua filters
- automatic frontmatter/mainmatter/backmatter
- drop caps
- typography improvements

## EPUB generation

EPUB output includes:

- custom CSS
- cover image
- title page
- copyright page
- dedication page
- automatic table of contents
- chapter splitting

## Utilities

PubDown also provides:

- DOCX → Markdown converter
- image extraction
- image path rewriting
- automatic `book.yaml` generation

## License

MIT

## Sample Content

The `sample/` directory contains excerpts from my book **Simulated Reality**.

These files are included exclusively as an example of a PubDown project. All text and images are © László Fazekas and are **not** covered by the software license of this repository. They may not be copied, redistributed, or reused without permission.

The good news is that the complete book is available **free of charge** in digital format at:

👉 **https://simulatedrealitybook.com/**

where you can also find links to the free eBook editions, the printed versions, and additional articles on the topics covered in the book.