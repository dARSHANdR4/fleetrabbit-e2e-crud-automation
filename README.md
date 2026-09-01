# FleetRabbit — E2E CRUD Test Automation

![Playwright](https://img.shields.io/badge/Playwright-1.48-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![Modules](https://img.shields.io/badge/Modules-21-blue)
![Test%20Cases](https://img.shields.io/badge/Test%20Cases-88-blue)

A Playwright + TypeScript end-to-end test automation suite built from scratch for **FleetRabbit**, a fleet management and maintenance SaaS platform. Covers full **Create → Read → Update → Delete** flows across all 21 functional modules of the product, driven by a clean Page Object Model architecture and wired into a CI pipeline that gates production deploys.

---

## Why this project

Manually regression-testing 21 modules before every release doesn't scale. This suite replaces that manual pass with an automated one: every module's core lifecycle — create a record, verify it appears, edit it, delete it — runs unattended against staging, on every push, with failure evidence (screenshots, video, trace) captured automatically.

## Modules covered

| # | Module | # | Module |
|---|---|---|---|
| 1 | Suppliers | 12 | Work Orders |
| 2 | Parts Inventory | 13 | Logbook |
| 3 | Purchase Orders | 14 | DVIR |
| 4 | Recalls | 15 | Dispatch |
| 5 | Compliance | 16 | Fleet |
| 6 | Fuel | 17 | Team Members |
| 7 | Tires | 18 | Inspection Checklists |
| 8 | Service Programs | 19 | Inspection Reminders |
| 9 | Service Tasks | 20 | Incident Reports |
| 10 | PM Schedules | 21 | Inspection Reports |
| 11 | Maintenance Requests | | |

## Engineering highlights

- **Page Object Model** — one class per module in `e2e/pages/`, so a UI change updates one file instead of every test that touches that screen.
- **Cross-module dependency ordering** — the Fleet module can only be populated once a fresh account exists, which the Team Members module creates via signup. Solved with Playwright project dependencies rather than test-order guesswork.
- **Real-world UI patterns handled**: custom Popover+Command comboboxes that don't expose standard ARIA roles, multi-step creation wizards, native `window.confirm()` dialogs mixed with custom `AlertDialog` confirms depending on the module, and date-time pickers with non-standard keyboard/mouse interaction.
- **Deterministic, collision-free test data** — every record is created with a timestamp-suffixed name (`Auto Supplier ${Date.now()}`) so parallel/re-run test executions never collide on unique-constraint fields.
- **CI-first design** — `test.describe.configure({ mode: 'serial' })` is used wherever Create → Read → Update → Delete must share one generated record, since Playwright's parallel workers would otherwise reload the spec fresh per test and regenerate the identifier.

## CI/CD pipeline

`.github/workflows/e2e-crud-pipeline.yml` runs the full suite in 3 sequential sets on every push/PR to `stg`, plus on demand via `workflow_dispatch`:

| Set | Modules | 
|---|---|
| 1 (01–07) | Suppliers → Tires |
| 2 (08–14) | Service Programs → DVIR |
| 3 (15–21) | Dispatch → Inspection Reports |

Each set caches the Playwright browser binary, runs headless, and uploads the HTML report plus (on failure) traces/screenshots/videos as build artifacts. A final `e2e-gate` job only goes green once all three sets pass — intended to be wired in as a required check before promoting `stg` → production.

## Structure

```
tests/          21 CRUD spec files (one per module)
e2e/pages/      Page Object Model classes
e2e/setup/      Authentication setup (runs once, shares session across all tests)
.github/        CI pipeline definition
```

## Running locally

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env   # fill in a staging test account
npm test
```

## Note

Real staging credentials, session storage, and generated reports are intentionally excluded — see `.env.example` for what's required to run this against a live staging environment.
