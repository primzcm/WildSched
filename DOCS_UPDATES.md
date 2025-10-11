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
- Added per-section remove controls and a remove-all option to the course list.

## 2025-10-11
- Removed per-section delete controls from generated schedules and added subject-level grouping with bulk removal in the course list.
- Highlighted course subject header rows for better visual separation in the course list.
- Polished course list interactions with hover/focus animations and removed schedule export buttons for a cleaner card header.
- Fixed course status display to include waitlisted students when summarizing enrollment totals and auto-exclude over-capacity sections by default.
- Replaced native time inputs with a custom spinner-enabled time picker that opens on field focus, allows direct typing inside the popover, and offers inline clear controls. (Minute field now commits on blur/enter so values can be typed freely.)
- Tweaked time picker typing to allow editing either digit without unexpected rollover for hour values.
- Improved manual time entry so both hour digits are captured sequentially (tens then ones).
- Relaxed minute typing so users can fully clear and retype values without automatic padding mid-entry.
