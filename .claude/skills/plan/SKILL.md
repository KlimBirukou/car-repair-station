---
name: plan
description: Build the plan. Checks that TASK.md exists, then starts the planner agent in mode plan to save context/PLAN.md. Use when the plan has no tasks.
disable-model-invocation: true
---

# Plan

Build the task plan for the Car Repair Station.

1. Check that `TASK.md` exists in the repository root (use Glob). If it does not, stop and tell the human: "TASK.md is missing. Write it first." Do nothing else.
2. Check that `context/PLAN.md` exists. If it already has tasks (a `### T-` heading), ask the human whether to replace them. Replacing is allowed only after the human says yes.
3. Start the `planner` agent with the Agent tool. Brief it: "Mode: plan. Read TASK.md, inspect the repository and the docs, and save the plan to context/PLAN.md." If the human gave a work item as an argument ($ARGUMENTS), add it: "Plan only this work item: $ARGUMENTS".
4. When the planner returns, read `context/PLAN.md` and report to the human: the number of tasks, the order in short, the planner's questions. Suggest the next step: the `evaluate-plan` skill.

Do not edit `context/PLAN.md` yourself.
