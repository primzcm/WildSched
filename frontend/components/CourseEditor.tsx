import { Fragment } from "react";
import type { Course, Section } from "@/lib/types";

interface CourseEditorProps {
  courses: Course[];
  excludedSections: string[];
  onToggleSection(sectionId: string): void;
  onRemoveSection(sectionId: string): void;
  onRemoveSubject(courseCode: string): void;
  onRemoveAll(): void;
}

export function CourseEditor({
  courses,
  excludedSections,
  onToggleSection,
  onRemoveSection,
  onRemoveSubject,
  onRemoveAll,
}: CourseEditorProps) {
  const excluded = new Set(excludedSections);
  const sectionCount = courses.reduce((sum, course) => sum + course.sections.length, 0);

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 shadow-lg">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Course List</h2>
          <p className="text-sm text-slate-300">Review imported sections, exclude or remove sections you do not want the solver to use.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm text-slate-400">
            Showing {sectionCount} section{sectionCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={onRemoveAll}
            disabled={!sectionCount}
            className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove all
          </button>
        </div>
      </header>
      <div className="overflow-x-auto">
        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
            <thead className="bg-slate-900/60 uppercase text-xs font-semibold tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
            {sectionCount ? (
              courses.map((course) => {
                if (!course.sections.length) {
                  return null;
                }
                return (
                  <Fragment key={course.code}>
                    <tr className="text-white">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-300 bg-indigo-100/80 px-4 py-3 shadow-inner transition-colors duration-200 ease-out dark:border-indigo-500/40 dark:bg-indigo-900/30">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">{course.code}</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300">{course.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveSubject(course.code)}
                            className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-50 dark:text-red-300 dark:hover:bg-red-900/30 dark:focus-visible:ring-offset-slate-900"
                          >
                            Remove subject
                          </button>
                        </div>
                      </td>
                    </tr>
                    {course.sections.map((section) => {
                      const isExcluded = excluded.has(section.id);
                      const rowClass = isExcluded ? "bg-red-900/30" : "";

                      return (
                        <tr key={section.id} className={rowClass}>
                          <td className="px-4 py-3 font-semibold text-white">{course.code}</td>
                          <td className="px-4 py-3">{course.name}</td>
                          <td className="px-4 py-3">{course.units ?? ""}</td>
                          <td className="px-4 py-3">{section.sectionCode}</td>
                          <td className="px-4 py-3">
                            <ul className="space-y-1">
                              {section.meetings.map((meeting, meetingIndex) => (
                                <li key={meetingIndex} className="font-mono">
                                  {formatDay(meeting.day)} {formatTime(meeting.start)}-{formatTime(meeting.end)} {meeting.kind ?? ""}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3">
                            {Array.from(new Set(section.meetings.map((meeting) => meeting.room).filter(Boolean))).join(", ")}
                          </td>
                          <td className="px-4 py-3 font-semibold">{renderStatus(section)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleSection(section.id)}
                                className={`rounded-md border px-3 py-1 text-xs font-semibold transform transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-900 ${
                                  isExcluded
                                    ? "border-red-500 text-red-400 hover:bg-red-500/10 focus-visible:ring-red-400"
                                    : "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 focus-visible:ring-emerald-400"
                                }`}
                              >
                                {isExcluded ? "Excluded" : "Included"}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSection(section.id)}
                                className="rounded-md border border-slate-500 px-3 py-1 text-xs font-semibold text-slate-700 transform transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-slate-300 dark:focus-visible:ring-offset-slate-900"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                  No courses to display. Paste blocks below and click Add to list.
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatDay(day: number): string {
  const map: Record<number, string> = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun",
  };
  return map[day] ?? `Day ${day}`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m.toString().padStart(2, "0")}${suffix}`;
}

function isSectionClosed(section: Section): boolean {
  const capacity = section.capacity;
  const totalEnrolled = getEnrollmentTotal(section);

  if (section.open === false) {
    return true;
  }
  if (capacity !== undefined) {
    if (totalEnrolled !== undefined) {
      return totalEnrolled >= capacity;
    }
    if (section.enrolled !== undefined) {
      return section.enrolled >= capacity;
    }
  }
  return false;
}

function renderStatus(section: Section): string {
  const capacity = section.capacity;
  const totalEnrolled = getEnrollmentTotal(section);

  if (isSectionClosed(section)) {
    if (capacity !== undefined && totalEnrolled !== undefined) {
      return `Closed (${totalEnrolled}/${capacity})`;
    }
    if (capacity !== undefined && section.enrolled !== undefined) {
      return `Closed (${section.enrolled}/${capacity})`;
    }
    return "Closed";
  }

  if (capacity !== undefined && totalEnrolled !== undefined) {
    return `${totalEnrolled}/${capacity}`;
  }
  if (capacity !== undefined && section.enrolled !== undefined) {
    return `${section.enrolled}/${capacity}`;
  }
  if (section.open === true) {
    return "Open";
  }
  if (totalEnrolled !== undefined) {
    return `${totalEnrolled}`;
  }
  return "Unknown";
}

function getEnrollmentTotal(section: Section): number | undefined {
  const hasCounts = section.enrolled !== undefined || section.waitlist !== undefined;
  if (!hasCounts) {
    return undefined;
  }
  return (section.enrolled ?? 0) + (section.waitlist ?? 0);
}


