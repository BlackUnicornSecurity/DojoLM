# @dojolm/scanner

`@dojolm/scanner` is now a thin compatibility package.

## What It Does

- re-exports `bu-tpi/scanner`
- re-exports `bu-tpi/types`
- keeps the web app and external imports stable

There is no separate scanner implementation in this package.

## Source Layout

```text
src/
├── index.ts    Barrel export
├── scanner.ts  Re-export of bu-tpi/scanner
└── types.ts    Re-export of bu-tpi/types
```

## Usage

```ts
import { scan } from '@dojolm/scanner';

const result = scan('ignore previous instructions');
console.log(result.verdict);
```

## Relationship To `bu-tpi`

If you want the canonical implementation, read or import from `bu-tpi`. This package exists to preserve a stable package name for consumers such as `dojolm-web`.
