import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"


def fetch_jobs_from_api(
    query: str,
    location: str = "remote",
    country: str = "in",
    experience: str = "",
    employment_type: str = "",
    date_posted: str = "all",
    roles: list[str] | None = None,
):
    """
    Fetch jobs matching ANY selected role.

    JSearch accepts a free-form search query, so selected role titles are
    combined with OR into one search. Multiple pages are requested so the
    result set is not limited to the first 10 jobs.
    """
    if not RAPIDAPI_KEY:
        raise RuntimeError(
            "RAPIDAPI_KEY is not configured. Add it to backend/.env and restart FastAPI."
        )

    search_roles = [role.strip() for role in (roles or [query]) if role and role.strip()]
    if not search_roles:
        raise RuntimeError("Select at least one job role.")

    # Search for any selected role rather than requiring every role.
    role_query = " OR ".join(f'"{role}"' for role in search_roles)
    search_query = f"({role_query})"
    if location:
        search_query += f" in {location}"

    querystring = {
        "query": search_query,
        "page": "1",
        "num_pages": "10",
        "country": country or "in",
    }

    if location:
        querystring["location"] = location
    if employment_type:
        querystring["employment_types"] = employment_type
    if date_posted and date_posted != "all":
        querystring["date_posted"] = date_posted

    experience_requirements = {
        "entry-level": "under_3_years_experience",
        "mid-level": "more_than_3_years_experience",
        "senior": "more_than_3_years_experience",
        "all": None,
    }
    requirement = experience_requirements.get((experience or "").lower())
    if requirement:
        querystring["job_requirements"] = requirement

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(
            JSEARCH_URL,
            headers=headers,
            params=querystring,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"JSearch request failed: {exc}") from exc

    if response.status_code != 200:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:1000]
        raise RuntimeError(
            f"JSearch returned HTTP {response.status_code}: {detail}"
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError("JSearch returned invalid JSON.") from exc

    if not isinstance(payload, dict):
        raise RuntimeError("JSearch returned an unexpected response format.")

    raw_jobs = payload.get("data", [])
    if not isinstance(raw_jobs, list):
        raise RuntimeError(
            f"JSearch returned an unexpected data field: {type(raw_jobs).__name__}"
        )

    jobs = []
    seen_ids = set()

    for job in raw_jobs:
        if not isinstance(job, dict):
            continue

        job_id = job.get("job_id") or job.get("job_apply_link")
        if job_id and job_id in seen_ids:
            continue

        if job_id:
            seen_ids.add(job_id)

        jobs.append(job)

    return jobs
