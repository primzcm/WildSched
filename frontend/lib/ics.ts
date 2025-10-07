import { Course, Meeting, Section } from "./types";

const BASE_DATE = new Date(Date.UTC(2024, 0, 1)); // Monday reference

export function generateICS(sections: Section[], courses: Course[]): string {
  const sectionMap = new Map<string, { course: Course; section: Section }>();
  for (const course of courses) {
    for (const section of course.sections) {
      sectionMap.set(section.id, { course, section });
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WildSched//Schedule Generator//EN",
  ];

  const timestamp = toICSDate(new Date());

  for (const section of sections) {
    const entry = sectionMap.get(section.id) ?? { course: findCourseForSection(courses, section), section };
    const course = entry.course;

    section.meetings.forEach((meeting, index) => {
      const startDate = computeDateTime(meeting);
      const endDate = computeDateTime(meeting, true);
      const uid = `${section.id}-${index}@wildsched`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${timestamp}`,
        `SUMMARY:${escapeText(`${course.code} ${section.sectionCode}`)}`,
        `DESCRIPTION:${escapeText(course.name)}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        sectionRoom(meeting),
        "END:VEVENT",
      );
    });
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function computeDateTime(meeting: Meeting, isEnd = false): string {
  const base = new Date(BASE_DATE.getTime());
  base.setUTCDate(BASE_DATE.getUTCDate() + (meeting.day - 1));
  const minutes = isEnd ? meeting.end : meeting.start;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  base.setUTCHours(hours, mins, 0, 0);
  return toICSDate(base);
}

function toICSDate(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function sectionRoom(meeting: Meeting): string {
  return meeting.room ? `LOCATION:${escapeText(meeting.room)}` : "";
}

function findCourseForSection(courses: Course[], section: Section): Course {
  for (const course of courses) {
    if (course.sections.some((candidate) => candidate.id === section.id)) {
      return course;
    }
  }
  return { id: section.id, code: section.id, name: section.id, sections: [section] };
}