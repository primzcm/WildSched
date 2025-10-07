from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Tuple

from ortools.sat.python import cp_model

from .schemas import Course, Preferences, SolveResponse, SolveResultItem, Section

W_PREF = 10


@dataclass(frozen=True)
class SectionStats:
    earliest_start: int
    latest_end: int
    pref_penalty: int
    gap_penalty: int


def generate_schedules(courses: Sequence[Course], prefs: Preferences, top_k: int) -> SolveResponse:
    model = cp_model.CpModel()
    section_vars: Dict[str, cp_model.IntVar] = {}
    section_stats: Dict[str, SectionStats] = {}
    section_records: List[Tuple[str, Section]] = []
    missing_courses: List[str] = []

    for course in courses:
        eligible_sections: List[Tuple[Section, cp_model.IntVar]] = []

        for section in course.sections:
            stats = build_section_stats(section, prefs)

            if violates_window(stats, prefs):
                continue

            var = model.NewBoolVar(section.id)
            section_vars[section.id] = var
            section_stats[section.id] = stats
            eligible_sections.append((section, var))

        if not eligible_sections:
            missing_courses.append(course.code)
            continue

        model.Add(sum(var for _, var in eligible_sections) == 1)

        for section, _ in eligible_sections:
            section_records.append((course.code, section))

    if not section_vars:
        rationale = build_rationale(prefs, 0, len(missing_courses))
        return SolveResponse(results=[], rationale=rationale, missingCourses=missing_courses)

    add_overlap_constraints(model, section_records, section_vars)

    pref_expr = sum(section_stats[sec_id].pref_penalty * var for sec_id, var in section_vars.items())
    gap_expr = sum(section_stats[sec_id].gap_penalty * var for sec_id, var in section_vars.items())
    gap_weight = int(round(100 * prefs.minimizeGaps))

    model.Minimize(W_PREF * pref_expr + gap_weight * gap_expr)

    results: List[SolveResultItem] = []
    seen: set[frozenset[str]] = set()

    for _ in range(max(1, top_k)):
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5.0
        solver.parameters.num_search_workers = 8

        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            break

        chosen: List[str] = [sec_id for sec_id, var in section_vars.items() if solver.BooleanValue(var)]
        signature = frozenset(chosen)
        if not chosen or signature in seen:
            break

        results.append(SolveResultItem(sections=chosen, score=int(round(solver.ObjectiveValue()))))
        seen.add(signature)

        model.Add(sum(section_vars[sec_id] for sec_id in chosen) <= len(chosen) - 1)

    rationale = build_rationale(prefs, len(results), len(missing_courses))
    return SolveResponse(results=results, rationale=rationale, missingCourses=missing_courses)


def build_section_stats(section: Section, prefs: Preferences) -> SectionStats:
    starts = [meeting.start for meeting in section.meetings]
    ends = [meeting.end for meeting in section.meetings]
    earliest_start = min(starts)
    latest_end = max(ends)

    noon = 12 * 60
    if prefs.mode == "morning":
        pref_penalty = max(0, earliest_start - noon)
    else:
        pref_penalty = max(0, noon - earliest_start)

    gap_penalty = sum(meeting.start // 30 for meeting in section.meetings)

    return SectionStats(
        earliest_start=earliest_start,
        latest_end=latest_end,
        pref_penalty=pref_penalty,
        gap_penalty=gap_penalty,
    )


def violates_window(stats: SectionStats, prefs: Preferences) -> bool:
    if prefs.earliestStart is not None and stats.earliest_start < prefs.earliestStart:
        return True
    if prefs.latestEnd is not None and stats.latest_end > prefs.latestEnd:
        return True
    return False


def add_overlap_constraints(
    model: cp_model.CpModel,
    section_records: Iterable[Tuple[str, Section]],
    section_vars: Dict[str, cp_model.IntVar],
) -> None:
    records = list(section_records)
    for i in range(len(records)):
        course_a, section_a = records[i]
        for j in range(i + 1, len(records)):
            course_b, section_b = records[j]
            if course_a == course_b:
                continue
            if sections_overlap(section_a, section_b):
                var_a = section_vars[section_a.id]
                var_b = section_vars[section_b.id]
                model.Add(var_a + var_b <= 1)


def sections_overlap(section_a: Section, section_b: Section) -> bool:
    for meeting_a in section_a.meetings:
        for meeting_b in section_b.meetings:
            if meeting_a.day != meeting_b.day:
                continue
            if meeting_a.start < meeting_b.end and meeting_b.start < meeting_a.end:
                return True
    return False


def build_rationale(prefs: Preferences, solution_count: int, missing_count: int = 0) -> str:
    mode_text = "Morning preference" if prefs.mode == "morning" else "Afternoon preference"
    message = (
        f"{mode_text}; gap weight {prefs.minimizeGaps:.2f}. "
        f"Generated {solution_count} schedule{'s' if solution_count != 1 else ''}."
    )
    if missing_count:
        message += f" {missing_count} course{'s' if missing_count != 1 else ''} could not be scheduled."
    return message

