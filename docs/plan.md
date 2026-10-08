# Plan and Progress

The single plan and progress file. Only the orchestrator writes it. Workflow and roles: root `CLAUDE.md`, section "Workflow: plan and progress". A task states WHAT only; HOW comes from the area's rules folder.

## Task format
```
### T-001 Title
- **Area:** backend | frontend
- **Agent:** db-dev | backend-dev | frontend-dev
- **Goal:**
- **Acceptance criteria:**
  - ...
- **WHAT to read:** `docs/...`
- **Depends on:** T-000 | none
- **Status:** todo | doing | review | done | blocked
- **Notes:**
```

## Tasks
No tasks yet. The planner proposes them and the orchestrator records them here.

## Assumptions
None yet. The orchestrator adds one line per assumption: the date, the task, the assumption, the reason.

## Run summary
The orchestrator fills this in at the end of a run: what is done, what is blocked, the assumptions, what the human should check.
