# .factory

Everything the factory needs to know about this project. People own it and change it through pull requests; agents read it and never edit it during a run.

| Path | What it is |
|---|---|
| `project.json` | Stack, check commands, how to run the app for QC, stack skills per role, design pointers, what needs a person before merging. Checked by `project-check.mjs`. |
| `product.md` | What the product is, for whom, and what is out of scope. |
| `decisions.md` | Answers people gave to questions, one line each with its source. Nobody asks them again; no ticket contradicts them. |
| `design/` | `DESIGN.md` (rules), `tokens.json` (W3C design tokens) or a pointer to where tokens live, `ui-store/` (screens and components as they are today), `mockups/` (approved mockups, by issue). |
| `plans/` | The plan the planner made when a ticket was clarified, kept so the build reuses what the person approved while the code it touches is unchanged. |
| `init.json` | Which setup steps are done, and what each was based on (`init-status.mjs`). |
| `runs/` | Working files of clarify and of runs on this machine. Not committed. |

Stack skills live in `.claude/skills/`, where Claude Code loads them.
