import { Course, Meeting, Section } from "./types";

const meetingRegex = /^(TH|SAT|SU|M|T|W|F|S)\s+(\d{1,2}:\d{2})(AM|PM)-(\d{1,2}:\d{2})(AM|PM)\s+([A-Z0-9]+(?:[ -][A-Z0-9]+)*)\s+(LEC|LAB|SEM|LEC\/LAB)$/i;

const dayMap: Record<string, number> = {
  M: 1,
  T: 2,
  W: 3,
  TH: 4,
  F: 5,
  S: 6,
  SAT: 6,
  SU: 7,
};

const kindMap: Record<string, Meeting["kind"]> = {
  LEC: "LEC",
  LAB: "LAB",
  SEM: "SEM",
  "LEC/LAB": "OTH",
};

function splitIntoBlocks(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  const headerRegex = /^\s*\d+\s*(?:\t+|\s{2,})/;

  const pushCurrent = () => {
    if (!current.length) {
      return;
    }
    const block = current.join("\n").trim();
    if (block) {
      blocks.push(block);
    }
    current = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      pushCurrent();
      continue;
    }
    if (headerRegex.test(line) && current.length) {
      pushCurrent();
    }
    current.push(line);
  }

  pushCurrent();
  return blocks;
}

export interface ParseCatalogResult {
  courses: Course[];
  warnings: string[];
}

export function parseCatalog(raw: string): Course[] {
  return parseCatalogDetailed(raw).courses;
}

export function parseCatalogDetailed(raw: string): ParseCatalogResult {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    return { courses: [], warnings: [] };
  }

  const warnings = new Set<string>();
  const courseAccumulator = new Map<
    string,
    {
      sections: Section[];
      nameCounts: Map<string, number>;
      units?: number;
      hasLab: boolean;
    }
  >();

  const blocks = splitIntoBlocks(trimmed);
  if (!blocks.length) {
    throw new Error("No section blocks found in the pasted catalog.");
  }

  for (const block of blocks) {
    const parsed = parseSectionBlock(block);
    const section = parsed.section;

    const entry = courseAccumulator.get(parsed.courseCode) ?? {
      sections: [],
      nameCounts: new Map<string, number>(),
      units: parsed.units,
      hasLab: false,
    };

    entry.sections.push(section);
    entry.units = entry.units ?? parsed.units;
    entry.hasLab ||= section.component === "LAB";
    entry.nameCounts.set(
      parsed.courseName,
      (entry.nameCounts.get(parsed.courseName) ?? 0) + 1,
    );

    if (entry.nameCounts.size > 1) {
      warnings.add(
        `Conflicting course names detected for ${parsed.courseCode}: ${Array.from(entry.nameCounts.keys()).join(
          ", "
        )}`,
      );
    }

    courseAccumulator.set(parsed.courseCode, entry);
  }

  const courses: Course[] = [];
  for (const [code, data] of courseAccumulator) {
    const name = selectMostFrequent(data.nameCounts);
    const components = data.hasLab ? ["LEC", "LAB"] : ["LEC"];

    courses.push({
      id: code,
      code,
      name,
      units: data.units,
      components,
      sections: dedupeSections(data.sections),
    });
  }

  courses.sort((a, b) => a.code.localeCompare(b.code));
  return { courses, warnings: Array.from(warnings) };
}

interface ParsedSectionBlock {
  courseCode: string;
  courseName: string;
  units?: number;
  section: Section;
}

function parseSectionBlock(block: string): ParsedSectionBlock {
  const rawLines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!rawLines.length) {
    throw new Error("Encountered an empty section block.");
  }

  const headerLine = rawLines[0];
  const headerParts = splitTSV(headerLine);
  if (headerParts.length < 6) {
    throw new Error(`Header line is malformed: "${headerLine}"`);
  }

  const [rowNo, , courseCode, courseName, unitsRaw, sectionCode] = headerParts;
  if (!rowNo || !courseCode || !courseName || !sectionCode) {
    throw new Error(`Header line missing required values: "${headerLine}"`);
  }

  const units = parseOptionalNumber(unitsRaw);
  const meetingLines: string[] = [];
  let metaLine: string | undefined;

  for (let i = 1; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (meetingRegex.test(line)) {
      meetingLines.push(line);
    } else {
      metaLine = line;
      if (i + 1 < rawLines.length) {
        const extras = rawLines.slice(i + 1).join(' ');
        if (extras.trim()) {
          metaLine = `${metaLine} ${extras.trim()}`;
        }
      }
      break;
    }
  }

  if (!meetingLines.length) {
    throw new Error(`Section ${courseCode}-${sectionCode} has no meeting lines.`);
  }

  if (!metaLine) {
    throw new Error(`Meta line not found for course ${courseCode} section ${sectionCode}.`);
  }

  const meetings = meetingLines.map((line) => parseMeetingLine(line));
  const metaParts = splitTSV(metaLine);
  if (metaParts.length < 5) {
    throw new Error(`Meta line is malformed for section ${courseCode}-${sectionCode}: "${metaLine}"`);
  }

  const [roomGroupRaw, capRaw, enrolledRaw, waitlistRaw, openRaw] = metaParts;
  const capacity = parseOptionalNumber(capRaw);
  const enrolled = parseOptionalNumber(enrolledRaw);
  const waitlist = parseOptionalNumber(waitlistRaw);
  const open = normalizeOpenFlag(openRaw);

  const component = meetings.some((m) => m.kind === "LAB") ? "LAB" : "LEC";
  const linkedGroup = deriveLinkedGroup(courseCode, roomGroupRaw, meetings);

  const section: Section = {
    id: `${courseCode}-${sectionCode}`,
    sectionCode,
    meetings,
    component,
    linkedGroup,
    capacity,
    enrolled,
    waitlist,
    open,
  };

  return {
    courseCode,
    courseName,
    units,
    section,
  };
}

function parseMeetingLine(line: string): Meeting {
  const match = line.match(meetingRegex);
  if (!match) {
    throw new Error(`Meeting line is invalid: "${line}"`);
  }

  const dayToken = match[1].toUpperCase();
  const day = toDay(dayToken);
  const start = toMinutes(match[2], match[3]);
  const end = toMinutes(match[4], match[5]);
  if (end <= start) {
    throw new Error(`Meeting time has non-positive duration: "${line}"`);
  }

  const room = match[6];
  const kindToken = match[7].toUpperCase();
  const kind = kindMap[kindToken] ?? "OTH";

  return { day, start, end, room, kind };
}

function toMinutes(time: string, meridiem: string): number {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error(`Invalid time token: "${time}${meridiem}"`);
  }

  let h = hour % 12;
  if (meridiem.toUpperCase() === "PM") {
    h += 12;
  }
  if (meridiem.toUpperCase() === "AM" && hour === 12) {
    h = 0;
  }
  return h * 60 + minute;
}

function toDay(token: string): number {
  const normalized = token.toUpperCase();
  const day = dayMap[normalized];
  if (!day) {
    throw new Error(`Unknown day token: "${token}"`);
  }
  return day;
}

function splitTSV(line: string): string[] {
  const tabParts = line
    .split(/\t+/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  if (tabParts.length > 1) {
    return tabParts;
  }
  const parts = line.trim().split(/\s+/);
  if (parts.length <= 1) {
    return parts;
  }
  return parts;
}

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? undefined : value;
}

function normalizeOpenFlag(raw: string | undefined): boolean | undefined {
  if (!raw) {
    return undefined;
  }
  const token = raw.trim().toLowerCase();
  if (token === "yes") {
    return false;
  }
  if (token === "no") {
    return true;
  }
  return undefined;
}

function deriveLinkedGroup(courseCode: string, roomGroupRaw: string | undefined, meetings: Meeting[]): string | undefined {
  if (!roomGroupRaw || !roomGroupRaw.includes("/")) {
    return undefined;
  }
  const kinds = new Set(meetings.map((m) => m.kind));
  if (!(kinds.has("LAB") && kinds.has("LEC"))) {
    return undefined;
  }
  return `${courseCode}:${roomGroupRaw}`;
}

function selectMostFrequent(nameCounts: Map<string, number>): string {
  let bestName = "";
  let bestScore = -1;
  for (const [name, count] of nameCounts) {
    if (count > bestScore) {
      bestName = name;
      bestScore = count;
    }
  }
  return bestName;
}

function dedupeSections(sections: Section[]): Section[] {
  const seen = new Map<string, Section>();
  for (const section of sections) {
    const key = `${section.sectionCode}:${section.meetings
      .map((m) => `${m.day}-${m.start}-${m.end}`)
      .join("|")}`;
    if (!seen.has(key)) {
      seen.set(key, section);
    }
  }
  return Array.from(seen.values());
}
