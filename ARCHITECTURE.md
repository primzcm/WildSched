# Architecture

WildSched consists of a TypeScript Next.js frontend and a Python FastAPI backend connected via a simple HTTP boundary. Persistence lives entirely in the browser through `localStorage`.

## Frontend (Next.js App Router)
- **UI components**: `FileImport`, `CourseEditor`, `PreferencesPanel`, `ScheduleCard`, and `CalendarGrid` compose the schedule builder UI.
- **Parsing**: `lib/parse.ts` transforms pasted catalog blocks into normalized `Course` models, handling validation, warnings, and deduplication.
- **Utilities**: `lib/ics.ts` generates `.ics` exports, while `lib/meetings.ts` provides overlap detection helpers.
- **State**: `app/page.tsx` stores raw input, parsed courses, user preferences, and exclusions. State is mirrored to `localStorage` under the `wildsched:v1` key for persistence.
- **API Proxy**: `app/api/solve/route.ts` forwards solve requests to the backend (`SOLVER_URL`) with a defensive timeout.

## Backend (FastAPI + OR-Tools)
- **Schemas**: `backend/schemas.py` defines Pydantic models mirroring the frontend types and enforces basic invariants (e.g., meeting durations).
- **Solver**: `backend/solver.py` builds a CP-SAT model with per-section decision variables, hard constraints for course coverage and time conflicts, and a weighted objective honoring time-of-day preferences and gap minimization.
- **Service**: `backend/main.py` exposes `POST /solve` for batch solving and `GET /healthz` for liveness checks. CORS is restricted to `FRONTEND_ORIGIN`.

## Data Flow
1. User pastes raw catalog text; the frontend parser emits normalized `Course[]` plus warnings.
2. User adjusts preferences/exclusions; the frontend persists state locally and sends `SolveRequest` payloads to `/api/solve`.
3. The proxy relays the request to FastAPI, which executes `generate_schedules` using OR-Tools to find top-K feasible schedules.
4. Results return to the UI for rendering and optional `.ics` export.

## Deployment Considerations
- Frontend requires `SOLVER_URL` to reach the backend; backend requires `FRONTEND_ORIGIN` for CORS.
- Solver parameters (workers, search timeout) are tunable in `backend/solver.py` if larger catalogs demand more time.
- No shared datastore: horizontal scaling is stateless on both sides.