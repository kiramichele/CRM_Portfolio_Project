"""Per-feature AI specs: the stable system prompt, the output JSON schema (the
forced tool's input_schema), the tool name, and which model to use.

Keeping these together makes each endpoint a thin "build user text → call
structured() → return" function, and keeps system prompts stable for caching.
"""

from .config import settings

FAST = settings.model_fast   # claude-haiku-4-5
SMART = settings.model_smart  # claude-sonnet-4-6


# --- match score ------------------------------------------------------------
MATCH_SCORE = {
    "model": FAST,
    "tool_name": "match_score",
    "max_tokens": 512,
    "system": (
        "You score how well a freelance provider fits a job, for a services "
        "marketplace. Weigh skills overlap, relevant experience in the bio, and "
        "budget realism. Be calibrated: 85-100 only for excellent fits, 60-84 "
        "solid, 40-59 partial, below 40 weak. The rationale is one sentence, "
        "concrete, and references the strongest signal. Never invent facts not "
        "present in the inputs."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "score": {"type": "integer", "minimum": 0, "maximum": 100},
            "rationale": {"type": "string", "description": "One concise sentence."},
        },
        "required": ["score", "rationale"],
    },
}


# --- applicant ranking ------------------------------------------------------
RANK_APPLICANTS = {
    "model": SMART,
    "tool_name": "applicant_ranking",
    "max_tokens": 1536,
    "system": (
        "You help a client rank applicants for their job. Rank by overall fit: "
        "skills match, evidence in the cover note, and bid value for money. For "
        "each applicant give a 0-100 score and a one-line summary of their key "
        "strength or concern. Then write a 1-2 sentence overview of the field. "
        "Base everything strictly on the provided data."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "ranking": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "score": {"type": "integer", "minimum": 0, "maximum": 100},
                        "summary": {"type": "string"},
                    },
                    "required": ["id", "score", "summary"],
                },
            },
            "overview": {"type": "string"},
        },
        "required": ["ranking", "overview"],
    },
}


# --- shortlist explainer ----------------------------------------------------
SHORTLIST_EXPLAINER = {
    "model": SMART,
    "tool_name": "shortlist",
    "max_tokens": 1536,
    "system": (
        "You explain a shortlist to a client. From the applicants, pick the top "
        "few (up to 3) and explain why each made the cut and how they differ "
        "from one another — so the client can choose, not just see scores in "
        "isolation. Then a one-sentence recommendation. Use only provided data."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "picks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "why": {"type": "string"},
                    },
                    "required": ["id", "why"],
                },
            },
            "comparison": {"type": "string", "description": "How the picks differ."},
            "recommendation": {"type": "string"},
        },
        "required": ["picks", "comparison", "recommendation"],
    },
}


# --- natural-language search → structured filters ---------------------------
SEARCH_PARSE = {
    "model": FAST,
    "tool_name": "search_filters",
    "max_tokens": 512,
    "system": (
        "You translate a natural-language job-search query into structured "
        "filters that a marketplace can apply. Extract free-text keywords, a "
        "budget floor/ceiling (numbers only), a budget type if implied, whether "
        "remote is requested, and the single best-matching category slug from "
        "the provided list (or null). Only fill a field when the query clearly "
        "implies it; otherwise use null."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "keywords": {"type": ["string", "null"]},
            "min_budget": {"type": ["number", "null"]},
            "max_budget": {"type": ["number", "null"]},
            "budget_type": {"type": ["string", "null"], "enum": ["fixed", "hourly", None]},
            "remote": {"type": ["boolean", "null"]},
            "category_slug": {"type": ["string", "null"]},
        },
        "required": ["keywords", "min_budget", "max_budget", "budget_type", "remote", "category_slug"],
    },
}


# --- NL analytics (admin) ---------------------------------------------------
ANALYTICS = {
    "model": SMART,
    "tool_name": "analytics_answer",
    "max_tokens": 1024,
    "system": (
        "You are an analytics assistant for a marketplace admin. You are given a "
        "question and a JSON snapshot of aggregated platform data. Answer the "
        "question directly and accurately FROM THE DATA ONLY — never fabricate "
        "numbers. Give a short prose answer plus a few bullet highlights with the "
        "concrete figures that support it. If the data can't answer the question, "
        "say so plainly."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "highlights": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["answer", "highlights"],
    },
}


# --- profile gap suggestions ------------------------------------------------
PROFILE_GAPS = {
    "model": SMART,
    "tool_name": "profile_gaps",
    "max_tokens": 1024,
    "system": (
        "You coach a freelance provider on improving their profile to win more "
        "work. Given their profile (and optionally in-demand skills on the "
        "platform), point out concrete gaps and high-leverage improvements: "
        "missing in-demand skills, a thin bio, an unclear headline, or pricing "
        "signals. Be specific and encouraging, not generic. 3-5 suggestions."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "detail": {"type": "string"},
                    },
                    "required": ["title", "detail"],
                },
            },
        },
        "required": ["summary", "suggestions"],
    },
}


# --- job-post assistant -----------------------------------------------------
JOB_ASSISTANT = {
    "model": SMART,
    "tool_name": "job_draft",
    "max_tokens": 1536,
    "system": (
        "You help a client turn a rough brief into a strong job posting. Produce "
        "a crisp title, a well-structured description (context, deliverables, and "
        "what a great applicant looks like), a realistic budget range with a "
        "budget type, the best-matching category slug from the provided list (or "
        "null), and a couple of short tips for attracting good applicants. Keep "
        "the client's intent; don't invent constraints they didn't state."
    ),
    "schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "budget_type": {"type": "string", "enum": ["fixed", "hourly"]},
            "budget_min": {"type": ["number", "null"]},
            "budget_max": {"type": ["number", "null"]},
            "category_slug": {"type": ["string", "null"]},
            "tips": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "description", "budget_type", "budget_min", "budget_max", "category_slug", "tips"],
    },
}
