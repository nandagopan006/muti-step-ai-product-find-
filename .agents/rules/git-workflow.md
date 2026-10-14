# Git Workflow & Conventional Commit Standards

Whenever working on features, bug fixes, or improvements in this repository, strictly adhere to the following workflow:

## 1. Branch Naming Convention
- Feature: `feat/<scope>-<description>` (e.g. `feat/search-filter-pipeline`)
- Bug fix: `fix/<scope>-<description>` (e.g. `fix/api-timeout-handler`)
- Refactoring: `refactor/<scope>-<description>` (e.g. `refactor/catalog-indexing`)
- Documentation: `docs/<scope>-<description>`
- Naming rules: All lowercase, hyphen/kebab-case, concise and descriptive.

## 2. Conventional Commits 1.0.0
Commit messages must strictly follow the Conventional Commits format:
```
<type>(<scope>): <short imperative description>

[optional body: bullet points explaining what changed and why]

[optional footer: e.g. Closes #12]
```
- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `chore`.
- Commits must be atomic: logical units of change rather than monolithic dumps.

## 3. Pre-Commit Quality Checks
Before any commit:
- Remove temporary debug code, leftover console logs, unused assets, or scratch files.
- Ensure secrets, credentials, and virtual environment files are never staged.
- Run tests (`manage.py test products`) and build verification (`npm run build`).

## 4. Pull Request (PR) Specification
When code is pushed to remote:
- Generate a comprehensive, markdown-formatted Pull Request description containing:
  - **Title** (`type(scope): concise title`)
  - **Summary & Motivation**
  - **Key Technical Changes**
  - **Verification & Test Results**
  - **Reviewer Checklist**
