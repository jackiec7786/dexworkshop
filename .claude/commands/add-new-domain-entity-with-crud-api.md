---
name: add-new-domain-entity-with-crud-api
description: Workflow command scaffold for add-new-domain-entity-with-crud-api in dexworkshop.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-domain-entity-with-crud-api

Use this workflow when working on **add-new-domain-entity-with-crud-api** in `dexworkshop`.

## Goal

Adds a new business domain entity (e.g., expenses, customers, inventory) with full CRUD API, database schema, shared types/constants, and UI integration.

## Common Files

- `db/schema.sql`
- `app/api/[entity]/route.ts`
- `app/api/[entity]/[id]/route.ts`
- `components/shared.tsx`
- `app/DashboardClient.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add new table DDL to db/schema.sql
- Create GET/POST and PATCH/DELETE API routes under app/api/[entity]/ and app/api/[entity]/[id]/route.ts
- Add types/constants for entity to components/shared.tsx
- Integrate new entity section into app/DashboardClient.tsx (UI, forms, lists, badges, etc.)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.