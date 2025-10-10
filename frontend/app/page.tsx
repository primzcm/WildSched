"use client";

import { useEffect, useMemo, useState } from "react";
import { CourseEditor } from "@/components/CourseEditor";
import { FileImport } from "@/components/FileImport";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { ScheduleCard } from "@/components/ScheduleCard";
import { generateICS } from "@/lib/ics";
import type { Course, Preferences, SolveResultItem, SolveResponse, Section } from "@/lib/types";

const STORAGE_KEY = "wildsched:v2";

const DEFAULT_PREFS: Preferences = {
  mode: "morning",
  minimizeGaps: 0.5,
};

function cloneCourse(course: Course): Course {
  return {
    ...course,
    sections: course.sections.map((section) => ({
      ...section,
      meetings: section.meetings.map((meeting) => ({ ...meeting })),
    })),
  };
}

function isSectionClosed(section: Section): boolean {
  if (section.open === false) {
    return true;
  }
  if (section.capacity !== undefined && section.enrolled !== undefined) {
    return section.enrolled >= section.capacity;
  }
  return false;
}

function mergeCourses(existing: Course[], additions: Course[]): Course[] {
  const map = new Map<string, Course>();

  existing.forEach((course) => {
    map.set(course.code, cloneCourse(course));
  });

  additions.forEach((incoming) => {
    const current = map.get(incoming.code);
    if (!current) {
      map.set(incoming.code, cloneCourse(incoming));
      return;
    }

    const mergedSections = [...current.sections];
    const sectionIndexById = new Map(mergedSections.map((section, index) => [section.id, index] as const));

    incoming.sections.forEach((incomingSection) => {
      const clone = {
        ...incomingSection,
        meetings: incomingSection.meetings.map((meeting) => ({ ...meeting })),
      };
      const existingIndex = sectionIndexById.get(incomingSection.id);
      if (existingIndex !== undefined) {
        mergedSections[existingIndex] = clone;
      } else {
        sectionIndexById.set(incomingSection.id, mergedSections.length);
        mergedSections.push(clone);
      }
    });

    const components = Array.from(new Set([...(current.components ?? []), ...(incoming.components ?? [])]));

    map.set(incoming.code, {
      ...current,
      name: current.name || incoming.name,
      units: current.units ?? incoming.units,
      components: components.length ? components : undefined,
      sections: mergedSections,
    });
  });

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export default function HomePage() {
  const [rawInput, setRawInput] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [excludedSections, setExcludedSections] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState<SolveResultItem[]>([]);
  const [solving, setSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [solverRationale, setSolverRationale] = useState<string | undefined>(undefined);
  const [solverReady, setSolverReady] = useState<boolean | null>(null);
  const [solverStatusMessage, setSolverStatusMessage] = useState<string | null>(null);
  const [missingCourses, setMissingCourses] = useState<string[]>([]);
  const [noScheduleHint, setNoScheduleHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      setRawInput(parsed.rawInput ?? "");
      setCourses(parsed.courses ?? []);
      setWarnings(parsed.warnings ?? []);
      setExcludedSections(parsed.excludedSections ?? []);
      setPrefs(parsed.prefs ?? DEFAULT_PREFS);
      setTopK(parsed.topK ?? 3);
      setMissingCourses(parsed.missingCourses ?? []);
      setNoScheduleHint(parsed.noScheduleHint ?? null);
    } catch (error) {
      console.warn("Failed to restore state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = {
      rawInput,
      courses,
      warnings,
      excludedSections,
      prefs,
      topK,
      missingCourses,
      noScheduleHint,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [rawInput, courses, warnings, excludedSections, prefs, topK, missingCourses, noScheduleHint]);

  useEffect(() => {
    let active = true;

    const checkSolver = async () => {
      try {
        const response = await fetch("/api/solver-status");
        if (!active) {
          return;
        }
        if (!response.ok) {
          throw new Error("Status endpoint returned an error");
        }
        const data: { ready: boolean; message?: string } = await response.json();
        setSolverReady(data.ready);
        setSolverStatusMessage(data.ready ? null : data.message ?? "Solver URL not configured.");
      } catch (error) {
        console.warn("Failed to verify solver status", error);
        if (!active) {
          return;
        }
        setSolverReady(false);
        setSolverStatusMessage(
          "Unable to reach solver status endpoint. Ensure the backend is running and SOLVER_URL is configured in frontend/.env.local.",
        );
      }
    };

    checkSolver();
    return () => {
      active = false;
    };
  }, []);

  const excludedSet = useMemo(() => new Set(excludedSections), [excludedSections]);

  const requestCourses = useMemo(
    () =>
      courses.map((course) => ({
        ...course,
        sections: course.sections.filter((section) => !excludedSet.has(section.id)),
      })),
    [courses, excludedSet],
  );

  const solveDisabledReason = (() => {
    if (solverReady === null) {
      return "Checking solver configuration...";
    }
    if (solverReady === false) {
      return solverStatusMessage ?? "Solver URL not configured.";
    }
    if (!courses.length) {
      return "Add at least one course before solving.";
    }
    return null;
  })();

  const handleAddCourses = (newCourses: Course[], parseWarnings: string[]) => {
    if (newCourses.length) {
      const merged = mergeCourses(courses, newCourses);
      setCourses(merged);
      const availableIds = new Set(merged.flatMap((course) => course.sections.map((section) => section.id)));
      const closedIds = new Set(
        merged.flatMap((course) => course.sections.filter((section) => isSectionClosed(section)).map((section) => section.id)),
      );

      setExcludedSections((current) => {
        const next = new Set(current.filter((id) => availableIds.has(id)));
        closedIds.forEach((id) => next.add(id));
        return Array.from(next);
      });
    }

    if (parseWarnings.length) {
      setWarnings((current) => {
        const next = new Set(current);
        parseWarnings.forEach((warning) => next.add(warning));
        return Array.from(next);
      });
    }

    setResults([]);
    setSolveError(null);
    setSolverRationale(undefined);
    setMissingCourses([]);
    setNoScheduleHint(null);
  };


  const handleRemoveSection = (sectionId: string) => {
    setCourses((current) =>
      current
        .map((course) => ({
          ...course,
          sections: course.sections.filter((section) => section.id !== sectionId),
        }))
        .filter((course) => course.sections.length > 0),
    );
    setExcludedSections((current) => current.filter((id) => id !== sectionId));
    setResults([]);
    setSolveError(null);
    setSolverRationale(undefined);
    setMissingCourses([]);
    setNoScheduleHint(null);
  };

  const handleRemoveSubject = (courseCode: string) => {
    const target = courses.find((course) => course.code === courseCode);
    const idsToRemove = new Set((target?.sections ?? []).map((section) => section.id));

    setCourses((current) => current.filter((course) => course.code !== courseCode));
    if (idsToRemove.size) {
      setExcludedSections((current) => current.filter((id) => !idsToRemove.has(id)));
    }
    setResults([]);
    setSolveError(null);
    setSolverRationale(undefined);
    setMissingCourses([]);
    setNoScheduleHint(null);
  };

  const handleRemoveAllSections = () => {
    setCourses([]);
    setExcludedSections([]);
    setResults([]);
    setSolveError(null);
    setSolverRationale(undefined);
    setMissingCourses([]);
    setNoScheduleHint(null);
  };

  const handleToggleSection = (sectionId: string) => {
    setExcludedSections((current) => {
      const set = new Set(current);
      if (set.has(sectionId)) {
        set.delete(sectionId);
      } else {
        set.add(sectionId);
      }
      return Array.from(set);
    });
  };

  const resolveSections = (ids: string[]): Section[] => {
    const map = new Map<string, Section>();
    courses.forEach((course) => {
      course.sections.forEach((section) => map.set(section.id, section));
    });
    return ids.map((id) => map.get(id)).filter((section): section is Section => Boolean(section));
  };

  const handleSolve = async () => {
    if (solverReady !== true) {
      setSolveError(solverStatusMessage ?? "Solver URL not configured.");
      return;
    }

    setSolving(true);
    setSolveError(null);
    setResults([]);
    setSolverRationale(undefined);
    setMissingCourses([]);
    setNoScheduleHint(null);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: requestCourses, prefs, topK }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(payload.error ?? "Solver request failed");
      }

      const data = (await response.json()) as SolveResponse;
      const generated = data.results ?? [];
      setResults(generated);
      setSolverRationale(data.rationale);
      const missing = data.missingCourses ?? [];
      setMissingCourses(missing);

      if (!generated.length) {
        const remainingCourseCodes = requestCourses
          .filter((course) => course.sections.length > 0)
          .map((course) => course.code);

        if (!remainingCourseCodes.length) {
          setNoScheduleHint('No sections meet the current time window or availability filters. Relax earliest/latest times or add additional sections.');
        } else {
          const unscheduled = remainingCourseCodes.filter((code) => !missing.includes(code));
          if (unscheduled.length) {
            setNoScheduleHint(`No conflict-free combination fits your filters for ${unscheduled.join(', ')}. Try relaxing the time window or excluding a section.`);
          } else {
            setNoScheduleHint('No sections meet the current time window or availability filters. Relax earliest/latest times or add additional sections.');
          }
        }
      } else {
        setNoScheduleHint(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to solver";
      setSolveError(message);
    } finally {
      setSolving(false);
    }
  };

  const handleExport = (sections: Section[]) => {
    const ics = generateICS(sections, courses);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wildsched.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">WildSched</h1>
          <p className="text-sm text-slate-300">
            Paste a catalog, choose your preferences, and generate ranked, conflict-free schedules using exact optimization.
          </p>
        </header>

        <CourseEditor
          courses={courses}
          excludedSections={excludedSections}
          onToggleSection={handleToggleSection}
          onRemoveSection={handleRemoveSection}
          onRemoveSubject={handleRemoveSubject}
          onRemoveAll={handleRemoveAllSections}
        />

        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 shadow-lg">
          <FileImport rawInput={rawInput} onRawInputChange={setRawInput} onAddCourses={handleAddCourses} />
        </section>

        {warnings.length ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            {warnings.map((warning) => (
              <p key={warning}>Warning: {warning}</p>
            ))}
          </div>
        ) : null}

        <PreferencesPanel
          prefs={prefs}
          topK={topK}
          onPrefsChange={setPrefs}
          onTopKChange={(value) => setTopK(Math.min(5, Math.max(1, value)))}
          onSolve={handleSolve}
          solving={solving}
          canSolve={!solveDisabledReason}
          disabledReason={solveDisabledReason}
        />

        {solveError ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {solveError}
          </div>
        ) : null}

        {solverRationale ? (
          <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-200">
            {solverRationale}
          </div>
        ) : null}

        {missingCourses.length ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            Unable to schedule: {missingCourses.join(", ")} (no sections satisfy the current time window or availability constraints).
          </div>
        ) : null}

        {noScheduleHint ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            {noScheduleHint}
          </div>
        ) : null}

        {!solving && results.length === 0 && courses.length ? (
          <p className="text-sm text-slate-400">No schedules yet. Add more sections and click Generate schedules when ready.</p>
        ) : null}

        {results.length ? (
          <section className="space-y-4">
            {results.map((result, index) => {
              const sections = resolveSections(result.sections);
              return (
                <ScheduleCard
                  key={result.sections.join("-")}
                  index={index}
                  score={result.score}
                  sections={sections}
                  courses={courses}
                  onExport={() => handleExport(sections)}
                />
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );



}


