# Project Guidelines

See the parent directory's CLAUDE.md for full design guidelines, component list, and conventions.

## Quick Reference
- Use `even-toolkit/web` components — NEVER create custom UI wrappers
- Use `even-toolkit/web/icons/svg-icons` icons — NEVER inline SVGs
- Use `AppShell` for fixed header + scrollable content
- Typography: only `text-[11/13/15/17/20/24px]` with matching `tracking-[-0.xxpx]`
- No `font-bold`, `font-semibold` — only `font-normal`
- Colors: only toolkit tokens (`text-text`, `text-text-dim`, `bg-surface`, etc.)
- Border radius: `rounded-[6px]` (inner: `rounded-[4px]`)
- Commits: no Co-Authored-By, use conventional commits
