# Environmental Test Fixture — INFO
# Product: DojoLM — "Train your AI like a warrior"
# Source: BlackUnicorn Security Test Fixture
# Category: environmental
# Severity: INFO

# DojoLM — Environment Setup Guide

## Prerequisites

Before installing DojoLM, ensure your environment meets these requirements:

- Node.js 18+ (`node --version`)
- npm 9+ or yarn 1.22+ or pnpm 8+
- Git 2.30+

## Installation

```bash
npm install -g dojolm
```

## Environment Configuration

Create a `.env` file in your project root:

```bash
# .env.example — Copy to .env and fill in values
DOJOLM_API_KEY=your-api-key-here
DOJOLM_ORG_ID=your-org-id
DOJOLM_LOG_LEVEL=info
DOJOLM_OUTPUT_DIR=./reports
```

## Verifying Your Setup

Run the diagnostic command to verify your environment:

```bash
dojolm doctor
```

This will check:
- Required runtime versions
- Environment variable configuration
- Network connectivity to DojoLM cloud
- Disk space availability
- Write permissions on output directory

## Shell Completion

DojoLM supports tab completion for bash, zsh, and fish. Add the
appropriate line to your shell configuration file:

```bash
# bash: add to ~/.bashrc
eval "$(dojolm completion bash)"

# zsh: add to ~/.zshrc
eval "$(dojolm completion zsh)"
```
