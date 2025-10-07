import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const solverUrl = process.env.SOLVER_URL;
  if (!solverUrl) {
    return NextResponse.json(
      {
        ready: false,
        message: "Solver URL not configured. Set SOLVER_URL in frontend/.env.local (e.g. http://localhost:8000) and restart the dev server.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ ready: true }, { status: 200 });
}
