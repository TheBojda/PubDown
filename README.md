# PubDown

**PubDown** is a developer-friendly publishing tool for building professional-quality **PDF** and **EPUB** books from Markdown.

It is built on top of **Pandoc**, but adds an opinionated project structure, automatic book assembly, EPUB/PDF templates, and utilities for converting existing DOCX manuscripts into Markdown projects.

## Why PubDown?

Pandoc is arguably the best document conversion tool ever created. It can convert between dozens of formats and serves as the foundation of countless publishing workflows.

However, writing an entire book directly with Pandoc quickly becomes cumbersome. You have to manually organize chapters, manage metadata, assemble front matter, configure EPUB and PDF generation separately, maintain templates, and repeatedly invoke long Pandoc commands.

PubDown was created to solve exactly these problems.

Instead of being yet another Markdown flavor, PubDown is a lightweight publishing framework built on top of Pandoc. It provides a clean project structure and automates the repetitive parts of book publishing while keeping the full power of Pandoc available underneath.

With PubDown you can:

- write each chapter as a separate Markdown file
- organize books into parts
- manage front matter and back matter
- generate professional PDF and EPUB editions from the same source
- customize templates, CSS and LaTeX
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

---

# Installation

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

---

# Project structure

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

---

# book.yaml

`book.yaml` defines the logical structure of the book.

Example:

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

---

# meta.yaml

Example:

```yaml
title: Simulated Reality
subtitle: An Exciting Journey
author: John Doe

language: en
latex-language: english

publisher: Example Publisher
rights: © 2026 John Doe
toc-title: Contents
```

---

# Building a book

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

---

# Importing an existing DOCX

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

---

# Markdown

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

# PDF generation

PDF output uses:

- Pandoc
- XeLaTeX
- custom print template
- Lua filters
- automatic frontmatter/mainmatter/backmatter
- drop caps
- typography improvements

---

# EPUB generation

EPUB output includes:

- custom CSS
- cover image
- title page
- copyright page
- dedication page
- automatic table of contents
- chapter splitting

---

# Utilities

PubDown also provides:

- DOCX → Markdown converter
- image extraction
- image path rewriting
- automatic metadata generation

---

# License

MIT

# Sample Book

The sample project included in this repository is based on excerpts from my book **Simulated Reality**.

It is provided solely to demonstrate the recommended PubDown project structure and publishing workflow.

The text, images, and other creative content remain copyrighted and **may not be copied, redistributed, or used to create derivative works**, except as permitted by applicable copyright law.

Only the PubDown source code is licensed under the project's software license.
