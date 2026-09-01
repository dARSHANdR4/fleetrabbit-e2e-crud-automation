# FleetRabbit — E2E CRUD Test Automation

Playwright + TypeScript end-to-end test automation suite covering **21 modules / 88 test cases** for the FleetRabbit fleet management portal, built with the Page Object Model pattern.

## What this demonstrates

- Full CRUD (Create / Read / Update / Delete) automation across every major module: Suppliers, Parts Inventory, Purchase Orders, Recalls, Compliance, Fuel, Tires, Service Programs, Service Tasks, PM Schedules, Maintenance Requests, Work Orders, Logbook, DVIR, Dispatch, Team Members, Fleet, Inspection Checklists, Inspection Reminders, Incident Reports, and Inspection Reports.
- Page Object Model architecture (`e2e/pages/`) — one class per module, reused across create/read/update/delete flows.
- Handling of real-world UI complexity: custom Popover+Command comboboxes, multi-step wizards, native `window.confirm()` dialogs, date-time pickers, and dynamic record naming to avoid test collisions.
- A cross-module dependency chain (Team Members signs up a fresh account that Fleet then depends on) solved via Playwright project ordering.
- A 3-stage GitHub Actions CI pipeline (`.github/workflows/e2e-crud-pipeline.yml`) that runs the full suite against staging on every push, uploads failure traces/screenshots/videos automatically, and gates deployment on all modules passing.

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
