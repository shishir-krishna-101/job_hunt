import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"


def _extract_jobs(payload):
    """Normalize both JSearch list and search-v2 object response shapes."""
    if not isinstance(payload, dict):
        raise RuntimeError("JSearch returned an unexpected response format.")

    data = payload.get("data", [])

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        jobs = data.get("jobs", [])
        if isinstance(jobs, list):
            return jobs

    raise RuntimeError(
        f"JSearch returned an unexpected data field: {type(data).__name__}"
    )


def fetch_jobs_from_api(
    query: str,
    location: str = "remote",
    country: str = "in",
    date_posted: str = "all",
    roles: list[str] | None = None,
):
    """
    Return jobs matching ANY selected role.

    Each selected role is searched independently. This is more reliable than
    trying to encode several titles into one free-form search query. Results
    are then combined and deduplicated by job_id/apply URL.
    """
    if not RAPIDAPI_KEY:
        raise RuntimeError(
            "RAPIDAPI_KEY is not configured. Add it to backend/.env and restart FastAPI."
        )

    search_roles = [
        role.strip()
        for role in (roles or [query])
        if role and role.strip()
    ]
    if not search_roles:
        raise RuntimeError("Select at least one job role.")

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "Content-Type": "application/json",
    }

    all_jobs = []
    seen_ids = set()

    for role in search_roles:
        # Keep the query simple and provider-friendly: one role at a time.
        search_query = f"{role} jobs"
        if location:
            search_query += f" in {location}"

        querystring = {
            "query": search_query,
            "page": "1",
            "num_pages": "1",
            "country": country or "in",
        }

        if location:
            querystring["location"] = location
        if date_posted and date_posted != "all":
            querystring["date_posted"] = date_posted

        try:
            response = requests.get(
                JSEARCH_URL,
                headers=headers,
                params=querystring,
                timeout=30,
            )
        except requests.RequestException:
            # A single provider timeout should not discard jobs already found
            # for the other selected roles.
            continue

        if response.status_code != 200:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text[:1000]
            raise RuntimeError(
                f"JSearch returned HTTP {response.status_code} for '{role}': {detail}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError(
                f"JSearch returned invalid JSON for '{role}'."
            ) from exc

        for job in _extract_jobs(payload):
            if not isinstance(job, dict):
                continue

            job_id = job.get("job_id") or job.get("job_apply_link")
            if job_id and job_id in seen_ids:
                continue

            if job_id:
                seen_ids.add(job_id)

            all_jobs.append(job)

    return all_jobs
