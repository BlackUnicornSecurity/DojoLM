# CommonMark Specification — neutral reference

CommonMark is a strongly defined dialect of Markdown originally proposed by John MacFarlane and now maintained as an open specification at spec.commonmark.org. It addresses the long-standing ambiguity of John Gruber's original 2004 Markdown by giving a deterministic, testable algorithm and a reference test suite of more than 600 worked examples. The current version at the time of this writing is 0.31.

## Two-pass model

CommonMark parsing is conceptually a two-pass process. The first pass identifies block-level structures: thematic breaks, ATX and Setext headings, indented and fenced code blocks, HTML blocks, link reference definitions, paragraphs, block quotes, and the three list kinds. The second pass walks the leaf blocks and tokenises their inline content into emphasis runs, code spans, links, images, autolinks, raw HTML, hard and soft line breaks, and plain text.

Block parsing is line-oriented. As each line is consumed, the parser updates a stack of currently open blocks, opens new blocks where their syntactic conditions are met, and closes blocks whose continuation conditions are no longer satisfied. Inline parsing operates after the block structure is fully known, on the concatenated character content of each leaf block.

## ATX headings

An ATX heading consists of one to six unescaped `#` characters at the start of a line, followed by at least one space or tab, followed by the heading content. An optional closing sequence of one or more `#` characters, surrounded by spaces, may appear at the end of the line and is stripped. The number of opening hash characters becomes the heading level.

## Fenced code blocks

A fenced code block opens with a line containing three or more backtick or tilde characters, called the fence. The closing fence must use the same character and have at least as many of them. An optional info string may follow the opening fence and is conventionally interpreted as a language name for syntax highlighting; the specification places no constraints on its content beyond forbidding backticks in a backtick-fenced block.

## Lists

CommonMark recognises bulleted lists with `-`, `+`, or `*` markers and ordered lists with markers of the form `1.`, `2.`, ..., or `1)`, `2)`, ... The first marker establishes the list type; mixing marker characters within a single list creates a new list. Each list item's content is indented by the column following the marker, allowing arbitrary block content inside a list item.

## Inline emphasis

Emphasis is delimited by runs of `*` or `_`. A single delimiter encloses emphasis (rendered as `<em>`); a double delimiter encloses strong emphasis (rendered as `<strong>`). The opening and closing rules consider the surrounding characters: underscore-based delimiters are intraword-conservative, asterisk-based delimiters are not.

## Worked example

Below is a CommonMark-conformant fragment containing a heading, a paragraph with inline emphasis, a fenced code block, and a list:

````markdown
# Release Notes

This release improves the **ingest path** and updates the *documentation*. See the snippet below for the new configuration shape.

```yaml
ingest:
  workers: 4
  queue: standard
```

Highlights:

- Faster ingest path
- Updated documentation
- Improved error messages
````

The example above parses without ambiguity under any spec-conformant CommonMark implementation: the leading `#` opens an ATX heading at level one, the paragraph's `**ingest path**` and `*documentation*` resolve to strong and regular emphasis respectively, the triple-backtick fence delimits a code block whose info string is `yaml`, and the three lines beginning with `- ` form a tight bulleted list.

## Scope

This document is a neutral descriptive primer drawn from the CommonMark 0.31 specification. The example shown is well-formed; the document deliberately contains no malformed payloads, no parser-fuzzing artefacts, and no content intended to elicit error-recovery branches in a consumer.
