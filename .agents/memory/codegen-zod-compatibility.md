---
name: OpenAPI integer compatibility
description: A workspace-specific compatibility note for OpenAPI-to-Zod generation.
---

The current generated validation package is on a Zod version where Orval's generated `zod.int()` calls are unavailable. Prefer numeric OpenAPI wire types for dashboard counts and IDs unless the workspace Zod dependency is upgraded deliberately.

**Why:** Code generation can succeed while the chained library typecheck fails, blocking the frontend build even though the OpenAPI document is valid.

**How to apply:** If integer fields are needed, confirm the installed Zod API and generated output before adding them to the shared spec.