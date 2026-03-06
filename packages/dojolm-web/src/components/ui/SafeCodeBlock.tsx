'use client'

/**
 * File: SafeCodeBlock.tsx
 * Purpose: XSS-safe code/evidence block renderer — uses only React text children, no raw HTML injection
 * Story: TPI-NODA-13.5 - Security Hardening
 * Index:
 * - SafeCodeBlockProps interface (line 16)
 * - Token type & tokenize function (line 25)
 * - KEYWORD_SETS (line 33)
 * - SafeCodeBlock component (line 89)
 */

import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'

export interface SafeCodeBlockProps {
  /** The raw code string to render */
  code: string
  /** Language hint for syntax highlighting (e.g. 'javascript', 'python', 'json') */
  language?: string
  /** Additional CSS class names */
  className?: string
  /** If set, truncate display after this many lines with a "... (N more lines)" indicator */
  maxLines?: number
}

/** Represents a single highlighted token */
interface Token {
  text: string
  type: 'keyword' | 'string' | 'number' | 'comment' | 'plain'
}

/** Language-specific keyword sets for highlighting */
const KEYWORD_SETS: Record<string, Set<string>> = {
  javascript: new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'class', 'new', 'import', 'export', 'default', 'from', 'async', 'await',
    'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined',
    'true', 'false', 'this', 'switch', 'case', 'break', 'continue', 'yield',
  ]),
  typescript: new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'class', 'new', 'import', 'export', 'default', 'from', 'async', 'await',
    'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined',
    'true', 'false', 'this', 'switch', 'case', 'break', 'continue', 'yield',
    'interface', 'type', 'enum', 'as', 'implements', 'extends', 'keyof',
    'readonly', 'private', 'public', 'protected', 'abstract', 'declare',
  ]),
  python: new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import',
    'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield',
    'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is',
    'None', 'True', 'False', 'async', 'await', 'self',
  ]),
  json: new Set(['true', 'false', 'null']),
}

// Alias common language names
KEYWORD_SETS['js'] = KEYWORD_SETS['javascript']
KEYWORD_SETS['ts'] = KEYWORD_SETS['typescript']
KEYWORD_SETS['tsx'] = KEYWORD_SETS['typescript']
KEYWORD_SETS['jsx'] = KEYWORD_SETS['javascript']
KEYWORD_SETS['py'] = KEYWORD_SETS['python']

/**
 * Simple token-based syntax highlighter.
 * Scans character-by-character. All output is plain text — no HTML injection possible.
 */
function tokenize(code: string, language?: string): Token[] {
  const keywords = language ? KEYWORD_SETS[language.toLowerCase()] : undefined
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    const ch = code[i]

    // Single-line comments: // ...
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      const commentEnd = end === -1 ? code.length : end
      tokens.push({ text: code.slice(i, commentEnd), type: 'comment' })
      i = commentEnd
      continue
    }

    // Python-style single-line comments: # ...
    if (ch === '#' && language && (language.toLowerCase() === 'python' || language.toLowerCase() === 'py')) {
      const end = code.indexOf('\n', i)
      const commentEnd = end === -1 ? code.length : end
      tokens.push({ text: code.slice(i, commentEnd), type: 'comment' })
      i = commentEnd
      continue
    }

    // Block comments: /* ... */
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const commentEnd = end === -1 ? code.length : end + 2
      tokens.push({ text: code.slice(i, commentEnd), type: 'comment' })
      i = commentEnd
      continue
    }

    // Strings: "..." or '...' or `...` (with basic escape handling)
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      let j = i + 1
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2 // skip escaped character
          continue
        }
        if (code[j] === quote) {
          j++
          break
        }
        j++
      }
      tokens.push({ text: code.slice(i, j), type: 'string' })
      i = j
      continue
    }

    // Numbers: digits (including decimals like 3.14, hex like 0xFF)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < code.length && /[0-9]/.test(code[i + 1]))) {
      let j = i
      // Handle hex prefix
      if (ch === '0' && i + 1 < code.length && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
        j += 2
        while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++
      } else {
        while (j < code.length && /[0-9.]/.test(code[j])) j++
        // Handle exponent notation (e.g. 1e10)
        if (j < code.length && (code[j] === 'e' || code[j] === 'E')) {
          j++
          if (j < code.length && (code[j] === '+' || code[j] === '-')) j++
          while (j < code.length && /[0-9]/.test(code[j])) j++
        }
      }
      tokens.push({ text: code.slice(i, j), type: 'number' })
      i = j
      continue
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i + 1
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++
      const word = code.slice(i, j)
      const isKeyword = keywords?.has(word) ?? false
      tokens.push({ text: word, type: isKeyword ? 'keyword' : 'plain' })
      i = j
      continue
    }

    // Everything else: operators, punctuation, whitespace
    tokens.push({ text: ch, type: 'plain' })
    i++
  }

  return tokens
}

/** CSS color classes per token type */
const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: 'text-[#c792ea]',    // purple — keywords
  string: 'text-[#c3e88d]',     // green — strings
  number: 'text-[#f78c6c]',     // orange — numbers
  comment: 'text-[#546e7a]',    // muted — comments
  plain: 'text-[#d6deeb]',      // light — plain text
}

/**
 * SafeCodeBlock renders code/evidence blocks with zero XSS risk.
 *
 * Security guarantees:
 * - All text is rendered as React JSX children in <span> elements (auto-escaped by React)
 * - Malicious HTML like `<img onerror=alert(1)>` renders as visible text, never as DOM elements
 * - No raw HTML insertion is used anywhere in this component
 */
export function SafeCodeBlock({ code, language, className, maxLines }: SafeCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        const success = document.execCommand('copy')
        if (success) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }, [code])

  const lines = useMemo(() => code.split('\n'), [code])
  const totalLines = lines.length
  const isTruncated = maxLines != null && totalLines > maxLines
  const visibleLines = isTruncated ? lines.slice(0, maxLines) : lines
  const visibleCode = visibleLines.join('\n')
  const hiddenCount = isTruncated ? totalLines - maxLines! : 0

  const tokens = useMemo(() => tokenize(visibleCode, language), [visibleCode, language])

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden',
        'border border-[var(--border)]',
        className,
      )}
    >
      {/* Header bar with language label and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(255,255,255,0.03)] border-b border-[var(--border)]">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium select-none">
          {language ?? 'text'}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            'min-w-[44px] min-h-[44px] justify-center',
            'text-muted-foreground hover:text-[var(--foreground)]',
            'hover:bg-[rgba(255,255,255,0.06)]',
            'motion-safe:transition-colors motion-safe:duration-150',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bu-electric)]',
          )}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
              <span className="sr-only">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code block — all content rendered as React text children, never as raw HTML */}
      <pre
        className={cn(
          'overflow-x-auto p-4 m-0',
          'bg-[rgba(0,0,0,0.3)]',
          'text-sm leading-relaxed font-mono',
        )}
      >
        <code>
          {tokens.map((token, idx) => (
            <span key={idx} className={TOKEN_COLORS[token.type]}>
              {/* React auto-escapes this text — XSS impossible */}
              {token.text}
            </span>
          ))}
        </code>
      </pre>

      {/* Truncation indicator */}
      {isTruncated && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-[rgba(0,0,0,0.2)] border-t border-[var(--border)]">
          ... ({hiddenCount} more line{hiddenCount !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  )
}
