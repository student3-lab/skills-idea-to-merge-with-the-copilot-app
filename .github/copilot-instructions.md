# Copilot instructions

Project context Copilot should apply to every session in this repository.

## Stack

- Framework: Astro (static output).
- Language: TypeScript.
- Styling: plain CSS in the base layout.

## Conventions

- Keep components small and focused.
- Prefer semantic HTML and accessible markup.
- Do not close, or add closing keywords for, the exercise walkthrough issue (issue #1) in any pull request. The exercise's GitHub Actions workflows manage that issue. When you open a pull request for app work, link only the specific app work-item issue you are implementing.

## Persistence and hydration rules

- Bookmarks are persisted in the browser's `localStorage`. Do not introduce a
  server-side or file-based persistence mechanism for this feature.
- Any code that touches `localStorage` (or other browser-only APIs) must run
  behind a `client:load` hydration boundary (an Astro island). Since the site
  builds with static output, server-side rendering must never execute
  browser-only code directly in `.astro` frontmatter or non-hydrated
  components.
