# Documentation Updates

## 2025-10-05
- Added AGENTS.md with collaboration rules and long-running tooling policy.
- Drafted ARCHITECTURE.md outlining frontend/backend responsibilities and data flow.
- Created root README with setup instructions for both services.

## 2025-10-07
- Revised parser to accept consecutive section headers without blank lines and keep closed/full sections visible.
- Reworked course list, preferences UI, and solver readiness checks; added backend status endpoint.
- Bumped localStorage key to v2 to invalidate stale warning data.
- Redesigned schedule calendar with full-day gridlines and disabled solve button until solver is configured.
- Added AGENTS.md to .gitignore so it stays local-only.
- Solver now skips unschedulable courses gracefully and reports them back to the UI.
- Added vertical scroll constraint to the course list table for easier navigation.
