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
    experience: str = "mid-level",
    employment_type: str = "FULLTIME",
    date_posted: str = "all",
    roles: list[str] | None = None,
):
    """Fetch and combine current jobs for one or more roles."""
    if not RAPIDAPI_KEY:
        raise RuntimeError(
            "RAPIDAPI_KEY is not configured. Add it to backend/.env and restart FastAPI."
        )

    search_roles = roles or [query]
    experience_requirements = {
        "entry-level": "under_3_years_experience",
        "mid-level": "more_than_3_years_experience",
        "senior": "more_than_3_years_experience",
        "all": None,
    }
    requirement = experience_requirements.get(experience.lower())

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }

    all_jobs = []
    seen_ids = set()

    for role in search_roles:
        querystring = {
            "query": f"{role} in {location}",
            "page": "1",
            "num_pages": "1",
            "country": country,
            "location": location,
            "employment_types": employment_type,
            "date_posted": date_posted,
        }
        if requirement:
            querystring["job_requirements"] = requirement

        try:
            response = requests.get(
                JSEARCH_URL,
                headers=headers,
                params=querystring,
                timeout=20,
            )
        except requests.RequestException as exc:
            raise RuntimeError(f"JSearch request failed for '{role}': {exc}") from exc

        if response.status_code != 200:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text[:500]
            raise RuntimeError(
                f"JSearch returned HTTP {response.status_code} for '{role}': {detail}"
            )

        payload = response.json()
        for job in payload.get("data", []):
            job_id = job.get("job_id") or job.get("job_apply_link")
            if job_id and job_id in seen_ids:
                continue
            if job_id:
                seen_ids.add(job_id)
            all_jobs.append(job)

    return all_jobs
