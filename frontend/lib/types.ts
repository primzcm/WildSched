export type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon..Sun

export interface Meeting {
  day: Day;
  start: number;
  end: number;
  room?: string;
  kind?: 'LEC' | 'LAB' | 'SEM' | 'OTH';
}

export interface Section {
  id: string;
  sectionCode: string;
  instructor?: string;
  meetings: Meeting[];
  component?: 'LEC' | 'LAB' | 'SEM' | 'OTH';
  linkedGroup?: string;
  capacity?: number;
  enrolled?: number;
  waitlist?: number;
  open?: boolean;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  units?: number;
  components?: ('LEC' | 'LAB' | 'SEM' | 'OTH')[];
  sections: Section[];
}

export interface Preferences {
  mode: 'morning' | 'afternoon';
  minimizeGaps: number;
  earliestStart?: number;
  latestEnd?: number;
}

export interface SolveRequest {
  courses: Course[];
  prefs: Preferences;
  topK: number;
}

export interface SolveResultItem {
  sections: string[];
  score: number;
}

export interface SolveResponse {
  results: SolveResultItem[];
  rationale?: string;
  missingCourses?: string[];
}
