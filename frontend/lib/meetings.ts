import { Meeting } from "./types";

export function overlaps(a: Meeting, b: Meeting): boolean {
  if (a.day !== b.day) {
    return false;
  }
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}