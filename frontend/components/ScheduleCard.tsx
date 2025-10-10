import type { Course, Section } from "@/lib/types";
import { CalendarGrid } from "./CalendarGrid";

interface ScheduleCardProps {
  index: number;
  score: number;
  sections: Section[];
  courses: Course[];
  onExport(): void;
}

export function ScheduleCard({ index, score, sections, courses, onExport }: ScheduleCardProps) {
  return (
    <article className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Schedule #{index + 1}</h3>
          <p className="text-xs text-gray-500">Score {score}</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="rounded-md border border-indigo-600 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
        >
          Export .ics
        </button>
      </header>
      <div>
        <h4 className="text-sm font-semibold">Included sections</h4>
        <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          {sections.map((section) => {
            const course = findCourse(courses, section.id);
            return (
              <li key={section.id} className="font-medium">
                {course?.code ?? section.id} ? {section.sectionCode}
              </li>
            );
          })}
        </ul>
      </div>
      <CalendarGrid sections={sections} courses={courses} />
    </article>
  );
}

function findCourse(courses: Course[], sectionId: string): Course | undefined {
  for (const course of courses) {
    if (course.sections.some((section) => section.id === sectionId)) {
      return course;
    }
  }
  return undefined;
}
