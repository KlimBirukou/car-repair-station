---
name: evaluate-plan
description: Compare context/PLAN.md with TASK.md and docs/, save the findings to context/PLAN_REVIEW.md and give a verdict (READY, READY WITH MINOR CHANGES, REVISE BEFORE IMPLEMENTATION).
disable-model-invocation: true
---

# Evaluate plan

Check the plan against the requirements and record the result.

1. Check that `TASK.md` and `context/PLAN.md` exist and that the plan has tasks (a `### T-` heading). If not, stop and say which one is missing.
2. Start the `reviewer` agent with the Agent tool. Brief it: "Plan review. Review context/PLAN.md against TASK.md and docs/ and return the review in the shape described in your Plan review section."
3. Write the reviewer's answer to `context/PLAN_REVIEW.md`, unchanged, under the title `# Plan Review`, with the line `Verdict: ...` near the top and a line `Reviewed: <date>`. Overwrite the previous review.
4. Tell the human the verdict and the blocking findings in a few lines.
5. If the verdict is `READY WITH MINOR CHANGES` or `REVISE BEFORE IMPLEMENTATION`, suggest running the planner in mode `revise`, then this skill again. If it is `READY`, say that the human can confirm the plan.

Do not edit `context/PLAN.md` yourself.
