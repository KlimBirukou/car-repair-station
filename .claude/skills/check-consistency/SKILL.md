---
name: check-consistency
description: Check that the documents, the rules, the agent definitions and the Log of decisions agree with each other. Takes a scope (docs, backend, frontend, process or all) and saves context/CONSISTENCY_REVIEW.md.
disable-model-invocation: true
argument-hint: "[docs|backend|frontend|process|all]"
---

# Check consistency

Check that the project files agree with each other and with the Log of `docs/decisions.md`.

1. The scope is `$ARGUMENTS`. Empty or `all` means the four scopes in this order: `docs`, `backend`, `frontend`,
   `process`. Any other value: stop and name the valid ones.
2. Check that `docs/decisions.md` and `TASK.md` exist. If not, stop and say which one is missing.
3. For each scope start a fresh `reviewer` with the Agent tool, one after another (each starts with a clean context):
   "Consistency review, scope: <scope>. Follow your Consistency review section and return the review in its shape.
   The Log of docs/decisions.md wins over every other file."
4. Write the answers to `context/CONSISTENCY_REVIEW.md` unchanged: the title `# Consistency Review`, a line
   `Reviewed: <date>`, then one section per scope that starts with its `Verdict: ...` line. Overwrite the previous file.
5. Tell the human the verdict of each scope, the blocking findings and the questions in a few lines. Suggest to fix the
   files by hand and to run the skill again for that scope.

Do not edit any file except `context/CONSISTENCY_REVIEW.md`.
