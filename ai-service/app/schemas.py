from typing import Any

from pydantic import BaseModel, Field


class JobIn(BaseModel):
    title: str
    description: str
    category: str | None = None
    budget_type: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None


class ProviderIn(BaseModel):
    display_name: str | None = None
    headline: str | None = None
    bio: str | None = None
    skills: list[str] = Field(default_factory=list)
    hourly_rate: float | None = None
    location: str | None = None


class ApplicantIn(BaseModel):
    id: str
    name: str | None = None
    headline: str | None = None
    skills: list[str] = Field(default_factory=list)
    bid_amount: float | None = None
    cover_note: str | None = None


class MatchScoreReq(BaseModel):
    job: JobIn
    provider: ProviderIn


class RankReq(BaseModel):
    job: JobIn
    applicants: list[ApplicantIn]


class SearchParseReq(BaseModel):
    query: str
    categories: list[str] = Field(default_factory=list)


class AnalyticsReq(BaseModel):
    question: str
    data: Any


class ProfileGapsReq(BaseModel):
    provider: ProviderIn
    in_demand_skills: list[str] = Field(default_factory=list)


class JobAssistantReq(BaseModel):
    brief: str
    categories: list[str] = Field(default_factory=list)
