---
name: plan-status
description: Show where the build stands, from context/PLAN.md. Tasks by status, blocked tasks with reasons, assumptions, open questions, files to fix, schema-freeze state. Read-only. Use when the human asks where the run stands.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
---

# Plan status

Report the state of the build. Change nothing.

1. Read `context/PLAN.md`. If it does not exist or has no `### T-` heading, say so and stop.
2. Count the tasks by status (`pending`, `doing`, `review`, `done`, `blocked`). Read each status as written in the file.
3. List: the task in `doing` or `review` (a `doing` task after a restart was interrupted), every `blocked` task with the
   reason from its notes, and the next `pending` task whose dependencies are all `done`.
4. Copy the sections "Assumptions", "Questions" and, if present, "Files to fix" from the run summary. Do not interpret
   them.
5. Grep `docs/decisions.md` for "Schema frozen". Say whether it is recorded. If the next task is a backend task and it
   is not recorded, say that the orchestrator must stop.
6. Answer in a short table plus the lists above. No advice beyond "next step: ...".
