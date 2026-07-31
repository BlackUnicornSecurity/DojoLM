<!-- SPDX-License-Identifier: Apache-2.0 -->

# Model / provider marks

Monochrome brand marks used to identify the **maker** of a model on the Jutsu
model cards (top-right of each card). They are resolved and tinted by
`src/app/(shell)/admin/jutsu/_components/providerColor.ts` (`providerLogo`).

## Provenance & trademarks

- The third-party `*.svg` marks are sourced from
  [`@lobehub/icons`](https://github.com/lobehub/lobe-icons) (MIT-licensed icon
  set). The MIT license covers the packaging; **the marks themselves are the
  trademarks of their respective owners.**
- They are included solely to **identify** each provider's model (nominative
  use) — never to imply endorsement, affiliation, or sponsorship.
- `blackunicorn.png` is Black Unicorn's own mark.

`*.svg` files are rendered as CSS `mask-image` and tinted to the brand color, so
they carry no color of their own; `blackunicorn.png` renders full-color.

## @lobehub/icons license

The third-party `*.svg` marks are redistributed under the MIT license of
[`@lobehub/icons`](https://github.com/lobehub/lobe-icons):

```
MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
