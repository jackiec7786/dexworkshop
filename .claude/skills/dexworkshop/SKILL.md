```markdown
# dexworkshop Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you how to contribute to the `dexworkshop` TypeScript codebase, which is organized without a formal framework. You'll learn the project's coding conventions, how to add or extend business domain entities with full CRUD APIs, update the database schema, integrate new features into the UI, and manage SVG assets for inspection diagrams. The guide also covers UI theming and layout overhauls, and provides command suggestions for common workflows.

---

## Coding Conventions

**File Naming**
- Use `camelCase` for file names.
  - Example: `dashboardClient.tsx`, `sharedTypes.tsx`

**Import Style**
- Prefer alias imports.
  - Example:
    ```typescript
    import { UserType } from '@/components/shared';
    ```

**Export Style**
- Use named exports.
  - Example:
    ```typescript
    export const ENTITY_TYPES = ['expense', 'customer'];
    export function getEntityById(id: string) { ... }
    ```

**Commit Messages**
- Mostly freeform, sometimes prefixed with `fix`.
- Keep messages concise (~59 characters on average).
  - Example: `fix: correct date parsing in expense API`

---

## Workflows

### Add New Domain Entity with CRUD API
**Trigger:** When you need to introduce a new tracked entity (table) with CRUD operations and a UI section.  
**Command:** `/new-table`

1. **Add new table DDL** to `db/schema.sql`.
    ```sql
    CREATE TABLE expenses (
      id SERIAL PRIMARY KEY,
      amount INT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    ```
2. **Create API routes**:
    - `app/api/expenses/route.ts` (GET, POST)
    - `app/api/expenses/[id]/route.ts` (PATCH, DELETE)
    ```typescript
    // app/api/expenses/route.ts
    export async function GET() { /* ... */ }
    export async function POST() { /* ... */ }
    ```
3. **Add types/constants** for the entity in `components/shared.tsx`.
    ```typescript
    export type Expense = { id: number; amount: number; description: string; };
    ```
4. **Integrate new entity section** into `app/DashboardClient.tsx` (UI, forms, lists, badges, etc.).
    ```tsx
    // app/DashboardClient.tsx
    import { Expense } from '@/components/shared';
    // ...render expense list and forms
    ```

---

### Database Schema and API Extension
**Trigger:** When you want to add a new column/feature to an existing entity (e.g., `scheduled_date` for jobs).  
**Command:** `/extend-table`

1. **ALTER TABLE** in `db/schema.sql`.
    ```sql
    ALTER TABLE jobs ADD COLUMN scheduled_date DATE;
    ```
2. **Update API route(s)** for the entity to handle the new field.
    ```typescript
    // app/api/jobs/[id]/route.ts
    export async function PATCH(req) {
      // handle scheduled_date
    }
    ```
3. **Update types/constants** in `components/shared.tsx` if needed.
    ```typescript
    export type Job = { id: number; scheduled_date?: string; /* ... */ };
    ```
4. **Update UI** in `app/DashboardClient.tsx` to use/display the new field.
    ```tsx
    <input type="date" name="scheduled_date" />
    ```
5. **Update validation** in `lib/validation.ts` if applicable.
    ```typescript
    export function validateJob(data) {
      // validate scheduled_date
    }
    ```

---

### UI Theme or Layout Overhaul
**Trigger:** When you want to change the overall look, color scheme, or mobile/desktop layout of the app.  
**Command:** `/theme-update`

1. **Update layout and theme tokens** in `app/layout.tsx` and/or CSS.
    ```tsx
    // app/layout.tsx
    <div className="theme-dark">{children}</div>
    ```
2. **Update shared UI components** in `components/shared.tsx` and `components/ui.tsx`.
    ```tsx
    // components/ui.tsx
    export function Button(props) { /* ... */ }
    ```
3. **Update main client UI** in `app/DashboardClient.tsx` for new structure or navigation.
4. **Adjust responsive behaviors and navigation patterns** as needed.

---

### SVG Asset and Inspection Diagram Update
**Trigger:** When you want to change the car inspection diagram visuals or logic.  
**Command:** `/update-svg-diagram`

1. **Update or replace SVG assets** in `public/` (e.g., `car-template.svg`).
2. **Update diagram rendering logic** in `components/shared.tsx`.
    ```tsx
    // components/shared.tsx
    import CarSVG from '@/public/car-template.svg';
    ```
3. **Update usage** in `app/DashboardClient.tsx` if needed.

---

## Testing Patterns

- **Test File Pattern:** `*.test.*`
- **Framework:** Unknown (no explicit framework detected)
- **Typical Test File Example:**  
  `utils.test.ts`  
  ```typescript
  import { sum } from './utils';

  test('sum adds numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
  ```
- Place test files alongside the code they test or in a dedicated test directory.

---

## Commands

| Command             | Purpose                                                                 |
|---------------------|-------------------------------------------------------------------------|
| /new-table          | Add a new domain entity with CRUD API, schema, and UI integration       |
| /extend-table       | Extend an existing entity/table and its API/UI for new fields/features  |
| /theme-update       | Overhaul the UI theme, layout, or responsive design                     |
| /update-svg-diagram | Update SVG assets and inspection diagram rendering logic                |
```
