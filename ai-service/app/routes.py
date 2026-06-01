"""AI endpoints. Each builds a compact user message from the request data,
forces a structured tool response, and returns the parsed JSON."""

from fastapi import APIRouter

from . import specs
from .llm import as_json, structured
from .schemas import (
    AnalyticsReq,
    JobAssistantReq,
    MatchScoreReq,
    ProfileGapsReq,
    RankReq,
    SearchParseReq,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def _run(spec: dict, user: str) -> dict:
    return structured(
        system=spec["system"],
        user=user,
        schema=spec["schema"],
        tool_name=spec["tool_name"],
        model=spec["model"],
        max_tokens=spec.get("max_tokens", 1024),
    )


@router.post("/match-score")
def match_score(req: MatchScoreReq) -> dict:
    user = (
        f"JOB:\n{as_json(req.job.model_dump())}\n\n"
        f"PROVIDER:\n{as_json(req.provider.model_dump())}\n\n"
        "Score this provider's fit for the job."
    )
    return _run(specs.MATCH_SCORE, user)


@router.post("/rank-applicants")
def rank_applicants(req: RankReq) -> dict:
    user = (
        f"JOB:\n{as_json(req.job.model_dump())}\n\n"
        f"APPLICANTS:\n{as_json([a.model_dump() for a in req.applicants])}\n\n"
        "Rank these applicants and give an overview."
    )
    return _run(specs.RANK_APPLICANTS, user)


@router.post("/shortlist-explainer")
def shortlist_explainer(req: RankReq) -> dict:
    user = (
        f"JOB:\n{as_json(req.job.model_dump())}\n\n"
        f"APPLICANTS:\n{as_json([a.model_dump() for a in req.applicants])}\n\n"
        "Pick the top few and explain how they differ."
    )
    return _run(specs.SHORTLIST_EXPLAINER, user)


@router.post("/search/parse")
def search_parse(req: SearchParseReq) -> dict:
    user = (
        f"AVAILABLE CATEGORY SLUGS: {as_json(req.categories)}\n\n"
        f'QUERY: "{req.query}"\n\n'
        "Extract structured search filters."
    )
    return _run(specs.SEARCH_PARSE, user)


@router.post("/analytics")
def analytics(req: AnalyticsReq) -> dict:
    user = (
        f"DATA:\n{as_json(req.data)}\n\n"
        f"QUESTION: {req.question}\n\n"
        "Answer from the data only."
    )
    return _run(specs.ANALYTICS, user)


@router.post("/profile-gaps")
def profile_gaps(req: ProfileGapsReq) -> dict:
    user = (
        f"PROVIDER PROFILE:\n{as_json(req.provider.model_dump())}\n\n"
        f"IN-DEMAND SKILLS ON THE PLATFORM: {as_json(req.in_demand_skills)}\n\n"
        "Suggest concrete profile improvements."
    )
    return _run(specs.PROFILE_GAPS, user)


@router.post("/job-assistant")
def job_assistant(req: JobAssistantReq) -> dict:
    user = (
        f"AVAILABLE CATEGORY SLUGS: {as_json(req.categories)}\n\n"
        f"ROUGH BRIEF:\n{req.brief}\n\n"
        "Turn this into a polished job posting."
    )
    return _run(specs.JOB_ASSISTANT, user)
