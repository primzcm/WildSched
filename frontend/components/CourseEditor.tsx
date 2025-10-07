import type { Course, Section } from "@/lib/types";

interface CourseEditorProps {
  courses: Course[];
  excludedSections: string[];
  onToggleSection(sectionId: string): void;
}

export function CourseEditor({ courses, excludedSections, onToggleSection }: CourseEditorProps) {
  const excluded = new Set(excludedSections);
  const rows = courses.flatMap((course) =>
    course.sections.map((section) => ({
      course,
      section,
    })),
  );

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 shadow-lg">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Course List</h2>
          <p className="text-sm text-slate-300">Review imported sections, exclude any you do not want the solver to use, or clear and re-import.</p>
        </div>
        <div className="text-sm text-slate-400">
          Showing {rows.length} section{rows.length === 1 ? "" : "s"}
        </div>
      </header>
      <div className="overflow-x-auto">
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
            {rows.length ? (
              rows.map(({ course, section }) => {
                const isExcluded = excluded.has(section.id);
                const closed = isSectionClosed(section);
                const rowClass = [isExcluded ? "bg-red-900/30" : "", closed ? "opacity-70" : ""].filter(Boolean).join(" ");

                return (
                  <tr key={section.id} className={rowClass}>
                    <td className="px-4 py-3 font-semibold text-white">{course.code}</td>
                    <td className="px-4 py-3">{course.name}</td>
                    <td className="px-4 py-3">{course.units ?? ""}</td>
                    <td className="px-4 py-3">{section.sectionCode}</td>
                    <td className="px-4 py-3">
                      <ul className="space-y-1">
                        {section.meetings.map((meeting, index) => (
                          <li key={index} className="font-mono">
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
                      <button
                        type="button"
                        onClick={() => onToggleSection(section.id)}
                        disabled={closed}
                        className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                          closed
                            ? "cursor-not-allowed border-slate-600 text-slate-500"
                            : isExcluded
                              ? "border-red-500 text-red-400 hover:bg-red-900/30"
                              : "border-emerald-500 text-emerald-400 hover:bg-emerald-900/30"
                        }`}
                      >
                        {closed ? "Closed" : isExcluded ? "Excluded" : "Included"}
                      </button>
                    </td>
                  </tr>
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
  if (section.open === false) {
    return true;
  }
  if (section.capacity !== undefined && section.enrolled !== undefined) {
    return section.enrolled >= section.capacity;
  }
  return false;
}

function renderStatus(section: Section): string {
  if (isSectionClosed(section)) {
    if (section.capacity !== undefined && section.enrolled !== undefined) {
      return `Closed (${section.enrolled}/${section.capacity})`;
    }
    return "Closed";
  }
  if (section.capacity !== undefined && section.enrolled !== undefined) {
    return `${section.enrolled}/${section.capacity}`;
  }
  if (section.open === true) {
    return "Open";
  }
  return "Unknown";
}
