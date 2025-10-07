import type { Course, Section } from "@/lib/types";

interface CalendarGridProps {
  sections: Section[];
  courses: Course[];
}

const MINUTES_START = 7 * 60;
const MINUTES_END = 22 * 60;
const TOTAL_MINUTES = MINUTES_END - MINUTES_START;
const DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export function CalendarGrid({ sections, courses }: CalendarGridProps) {
  const sectionLookup = new Map<string, { course: Course; section: Section }>();
  for (const course of courses) {
    for (const section of course.sections) {
      sectionLookup.set(section.id, { course, section });
    }
  }

  const meetingsByDay = new Map<number, Array<{ section: Section; label: string }>>();
  for (const section of sections) {
    const match = sectionLookup.get(section.id) ?? { course: findCourse(courses, section), section };
    const label = `${match.course.code} ${section.sectionCode}`;
    for (const meeting of section.meetings) {
      const list = meetingsByDay.get(meeting.day) ?? [];
      list.push({ section: { ...section, meetings: [meeting] }, label });
      meetingsByDay.set(meeting.day, list);
    }
  }

  const hourMarks = generateMarks(60);
  const halfHourMarks = generateMarks(30, true);

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <div className="grid min-w-[960px] grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-4">
        <div />
        {DAYS.map((day) => (
          <div key={`header-${day}`} className="text-center text-sm font-semibold text-slate-200">
            {DAY_LABELS[day]}
          </div>
        ))}

        <TimeColumn hourMarks={hourMarks} />

        {DAYS.map((day) => {
          const meetings = meetingsByDay.get(day) ?? [];
          return (
            <div
              key={`day-${day}`}
              className="relative rounded-lg border border-slate-800 bg-slate-900/40"
              style={{ height: `${TOTAL_MINUTES}px` }}
            >
              {hourMarks.map((minutes) => (
                <div
                  key={`hour-${day}-${minutes}`}
                  className="absolute left-0 right-0 border-t border-slate-800/80"
                  style={{ top: `${toOffset(minutes)}px` }}
                />
              ))}
              {halfHourMarks.map((minutes) => (
                <div
                  key={`half-${day}-${minutes}`}
                  className="absolute left-0 right-0 border-t border-slate-800/40"
                  style={{ top: `${toOffset(minutes)}px` }}
                />
              ))}

              {meetings.map(({ section: sec, label }) => {
                const meeting = sec.meetings[0];
                const start = Math.max(meeting.start, MINUTES_START);
                const end = Math.min(meeting.end, MINUTES_END);
                const top = toOffset(start);
                const height = Math.max(28, toOffset(end) - top);

                return (
                  <div
                    key={`${sec.id}-${meeting.start}-${meeting.end}`}
                    className="absolute inset-x-1 z-10 rounded-lg border border-indigo-300/40 bg-gradient-to-br from-indigo-500/80 via-indigo-500/70 to-indigo-600/80 p-3 text-xs text-indigo-50 shadow-lg"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <div className="text-[11px] text-indigo-100">{formatRange(meeting.start, meeting.end)}</div>
                    {meeting.room ? (
                      <div className="text-[11px] text-indigo-200">{meeting.room}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeColumn({ hourMarks }: { hourMarks: number[] }) {
  return (
    <div
      className="relative rounded-lg border border-slate-800 bg-slate-900/40"
      style={{ height: `${TOTAL_MINUTES}px` }}
    >
      {hourMarks.map((minutes) => (
        <div
          key={`time-${minutes}`}
          className="absolute left-0 right-0"
          style={{ top: `${toOffset(minutes)}px`, transform: "translateY(-50%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="ml-2 w-12 text-right text-[11px] font-medium text-slate-400">
              {formatTime(minutes)}
            </span>
            <div className="mt-0.5 h-px flex-1 bg-slate-800/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

function generateMarks(step: number, skipHour = false): number[] {
  const marks: number[] = [];
  for (let minutes = MINUTES_START; minutes < MINUTES_END; minutes += step) {
    if (skipHour && minutes % 60 === 0) {
      continue;
    }
    marks.push(minutes);
  }
  return marks;
}

function toOffset(minutes: number): number {
  return Math.max(0, Math.min(TOTAL_MINUTES, minutes - MINUTES_START));
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m.toString().padStart(2, "0")}${suffix}`;
}

function formatRange(start: number, end: number): string {
  return `${formatTime(start)} ? ${formatTime(end)}`;
}

function findCourse(courses: Course[], section: Section): Course {
  const fallback: Course = { id: section.id, code: section.id, name: section.id, sections: [section] };
  for (const course of courses) {
    if (course.sections.some((candidate) => candidate.id === section.id)) {
      return course;
    }
  }
  return fallback;
}






