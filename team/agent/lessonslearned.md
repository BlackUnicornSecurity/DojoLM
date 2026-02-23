# Claude Lessons Learned

This document logs mistakes made during development to avoid repeating them.

---

## 2025-02-13

### Mistake 1: Created duplicate folder structure
- **What happened**: Created a file at `docs/team/planned-features/UI-design.md` when `team/planning/planned-features/` already existed
- **Root cause**: Did not check existing folder structure before creating new folders/files
- **Lesson learned**: Always use `find` or `ls` to verify if a target folder exists before creating files. Check multiple variations like `team/` vs `docs/team/` vs `team/planning/`
- **Action taken**: Cleaned up the duplicate `docs/team` directory

### How to prevent this
Before creating any folder or file:
1. Use `find /Users/paultinp/BU-TPI -type d -name "foldername"` to search for existing folders
2. Use `ls -la` to see what exists in parent directories
3. Ask the user to clarify if there's ambiguity about where a file should go

---
