import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const DEFAULT_TIMEOUT_MS = 7000;

export async function POST(request: NextRequest) {
  const solverUrl = process.env.SOLVER_URL;
  if (!solverUrl) {
    return new Response(JSON.stringify({ error: "Solver URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await request.json();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/solve", solverUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text || "Solver error" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.text();
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Solver request timed out" : "Solver request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 504,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }
}