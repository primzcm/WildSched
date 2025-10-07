from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

Day = Literal[1, 2, 3, 4, 5, 6, 7]
Kind = Literal["LEC", "LAB", "SEM", "OTH"]


class Meeting(BaseModel):
    day: Day
    start: int = Field(ge=0, le=24 * 60)
    end: int = Field(ge=0, le=24 * 60)
    room: Optional[str] = None
    kind: Optional[Kind] = None

    @model_validator(mode="after")
    def check_duration(self) -> "Meeting":
        if self.end <= self.start:
            raise ValueError("Meeting end must be after start")
        return self


class Section(BaseModel):
    id: str
    sectionCode: str
    instructor: Optional[str] = None
    meetings: List[Meeting]
    component: Optional[Kind] = None
    linkedGroup: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=0)
    enrolled: Optional[int] = Field(default=None, ge=0)
    waitlist: Optional[int] = Field(default=None, ge=0)
    open: Optional[bool] = None

    @model_validator(mode="after")
    def ensure_meetings(self) -> "Section":
        if not self.meetings:
            raise ValueError("Section must contain at least one meeting")
        return self


class Course(BaseModel):
    id: str
    code: str
    name: str
    units: Optional[int] = Field(default=None, ge=0)
    components: Optional[List[Kind]] = None
    sections: List[Section]



class Preferences(BaseModel):
    mode: Literal["morning", "afternoon"]
    minimizeGaps: float = Field(ge=0.0, le=1.0)
    earliestStart: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    latestEnd: Optional[int] = Field(default=None, ge=0, le=24 * 60)

    @field_validator("minimizeGaps")
    @classmethod
    def clamp_minimize_gaps(cls, value: float) -> float:
        return max(0.0, min(1.0, value))

    @model_validator(mode="after")
    def ensure_ranges(self) -> "Preferences":
        if self.earliestStart is not None and self.latestEnd is not None:
            if self.earliestStart >= self.latestEnd:
                raise ValueError("earliestStart must be before latestEnd")
        return self


class SolveRequest(BaseModel):
    courses: List[Course]
    prefs: Preferences
    topK: int = Field(default=1, ge=1, le=20)


class SolveResultItem(BaseModel):
    sections: List[str]
    score: int


class SolveResponse(BaseModel):
    results: List[SolveResultItem] = Field(default_factory=list)
    rationale: Optional[str] = None
    missingCourses: List[str] = Field(default_factory=list)