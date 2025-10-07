# WildSched

WildSched is a no-login schedule generator that transforms pasted catalog text into normalized data and computes top-ranked, conflict-free schedules using an OR-Tools CP-SAT solver.

## Features
- Paste registrar catalog text and normalize it into structured course data.
- Exclude individual sections before solving and persist state in `localStorage`.
- Rank schedules based on morning vs. afternoon preference and gap minimization.
- Proxy solve requests from the Next.js frontend to a FastAPI backend.
- Export selected schedules to `.ics` files for calendar import.

## Requirements
- Node.js 18 or later
- Python 3.11 or later

## Getting Started

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
The development server runs on `http://localhost:3000`. Set `SOLVER_URL` in a `.env.local` file to point to the FastAPI backend, e.g. `http://localhost:8000`.

### Backend (FastAPI + OR-Tools)
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Unix-like systems
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Configure the allowed frontend origin with `FRONTEND_ORIGIN` (defaults to `http://localhost:3000`).

## Testing
- Frontend: `npm run lint`
- Backend: add unit tests under `backend/tests` and run with `pytest` (not included yet).

## Project Structure
- `frontend/` ? Next.js App Router frontend (TypeScript, Tailwind, local parsing/UI).
- `backend/` ? FastAPI service exposing `/solve`, backed by OR-Tools CP-SAT.
- `lib/` (frontend) ? Parsing, ICS generation, and schedule utilities.
- `AGENTS.md` ? Shared collaboration guidelines.
- `ARCHITECTURE.md` ? High-level system design and data flow.
- `DOCS_UPDATES.md` ? Changelog for documentation updates.

## Deployment
- Frontend can be deployed to Vercel or any Node-compatible host.
- Backend can be hosted on any Python environment with OR-Tools support (e.g., containerized with UVicorn/Gunicorn).
- Set `SOLVER_URL` in the frontend environment to the deployed backend URL and configure CORS via `FRONTEND_ORIGIN`.