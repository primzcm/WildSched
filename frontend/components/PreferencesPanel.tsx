"use client";

import type { Preferences } from "@/lib/types";

interface PreferencesPanelProps {
  prefs: Preferences;
  topK: number;
  onPrefsChange(next: Preferences): void;
  onTopKChange(value: number): void;
  onSolve(): void;
  solving: boolean;
  canSolve: boolean;
  disabledReason?: string | null;
}

export function PreferencesPanel({
  prefs,
  topK,
  onPrefsChange,
  onTopKChange,
  onSolve,
  solving,
  canSolve,
  disabledReason,
}: PreferencesPanelProps) {
  const handleTimeChange = (field: "earliestStart" | "latestEnd", value: string) => {
    if (!value) {
      onPrefsChange({ ...prefs, [field]: undefined });
      return;
    }
    const minutes = timeToMinutes(value);
    onPrefsChange({ ...prefs, [field]: minutes });
  };

  const buttonDisabled = solving || !canSolve;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-6 shadow-lg">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Preferences</h2>
        <p className="text-sm text-slate-300">
          Solver finds conflict-free schedules that respect your preferences and returns the top ranked options.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-200">Time of day</legend>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="prefs-mode"
              value="morning"
              checked={prefs.mode === "morning"}
              onChange={() => onPrefsChange({ ...prefs, mode: "morning" })}
            />
            Morning focus (earlier classes preferred)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="prefs-mode"
              value="afternoon"
              checked={prefs.mode === "afternoon"}
              onChange={() => onPrefsChange({ ...prefs, mode: "afternoon" })}
            />
            Afternoon focus (later classes preferred)
          </label>
        </fieldset>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="gaps-slider">
            Minimize gaps
          </label>
          <input
            id="gaps-slider"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={prefs.minimizeGaps}
            onChange={(event) => onPrefsChange({ ...prefs, minimizeGaps: Number.parseFloat(event.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-slate-400">Current weight: {prefs.minimizeGaps.toFixed(1)}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="earliest-time">
            Earliest start (optional)
          </label>
          <input
            id="earliest-time"
            type="time"
            value={prefs.earliestStart !== undefined ? minutesToTime(prefs.earliestStart) : ""}
            onChange={(event) => handleTimeChange("earliestStart", event.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="latest-time">
            Latest end (optional)
          </label>
          <input
            id="latest-time"
            type="time"
            value={prefs.latestEnd !== undefined ? minutesToTime(prefs.latestEnd) : ""}
            onChange={(event) => handleTimeChange("latestEnd", event.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="topk">
            Top schedules to return
          </label>
          <input
            id="topk"
            type="number"
            min={1}
            max={5}
            value={topK}
            onChange={(event) => onTopKChange(Number.parseInt(event.target.value, 10) || 1)}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col items-end justify-end gap-2">
          <button
            type="button"
            onClick={onSolve}
            disabled={buttonDisabled}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {solving ? "Solving?" : "Generate schedules"}
          </button>
          {!canSolve && disabledReason ? (
            <p className="text-xs text-red-400">{disabledReason}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hourStr, minuteStr] = value.split(":");
  const hours = Number.parseInt(hourStr, 10);
  const minutes = Number.parseInt(minuteStr, 10);
  return hours * 60 + minutes;
}
