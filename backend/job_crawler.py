import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

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


def _search_one_role(
    role: str,
    location: str,
    country: str,
    date_posted: str,
):
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
            timeout=20,
        )
    except requests.RequestException as exc:
        return role, [], f"JSearch request failed: {exc}"

    if response.status_code != 200:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:1000]
        return role, [], f"JSearch returned HTTP {response.status_code}: {detail}"

    try:
        payload = response.json()
        jobs = _extract_jobs(payload)
    except (ValueError, RuntimeError) as exc:
        return role, [], str(exc)

    clean_jobs = [job for job in jobs if isinstance(job, dict)]
    return role, clean_jobs, None


def _prepare_roles(query: str, roles: list[str] | None):
    selected = roles or [query]
    return [role.strip() for role in selected if role and role.strip()]


def stream_jobs_from_api(
    query: str,
    location: str = "remote",
    country: str = "in",
    date_posted: str = "all",
    roles: list[str] | None = None,
):
    """
    Stream jobs as soon as each role's provider request completes.

    NDJSON events:
      {"type":"role_started","role":"..."}
      {"type":"jobs","role":"...","jobs":[...]}
      {"type":"role_error","role":"...","message":"..."}
      {"type":"done","total":N}
    """
    if not RAPIDAPI_KEY:
        yield json.dumps({
            "type": "error",
            "message": "RAPIDAPI_KEY is not configured. Add it to backend/.env and restart FastAPI.",
        }) + "\n"
        return

    search_roles = _prepare_roles(query, roles)
    if not search_roles:
        yield json.dumps({"type": "error", "message": "Select at least one job role."}) + "\n"
        return

    for role in search_roles:
        yield json.dumps({"type": "role_started", "role": role}) + "\n"

    seen_ids = set()
    total = 0

    # Run several role searches concurrently. Results are yielded immediately
    # when any worker finishes instead of waiting for all roles.
    with ThreadPoolExecutor(max_workers=min(4, len(search_roles))) as executor:
        futures = {
            executor.submit(
                _search_one_role,
                role,
                location,
                country,
                date_posted,
            ): role
            for role in search_roles
        }

        for future in as_completed(futures):
            role = futures[future]
            try:
                completed_role, jobs, error = future.result()
            except Exception as exc:
                completed_role, jobs, error = role, [], str(exc)

            if error:
                yield json.dumps({
                    "type": "role_error",
                    "role": completed_role,
                    "message": error,
                }) + "\n"
                continue

            unique_jobs = []
            for job in jobs:
                job_id = job.get("job_id") or job.get("job_apply_link")
                dedupe_key = job_id or json.dumps(job, sort_keys=True)
                if dedupe_key in seen_ids:
                    continue
                seen_ids.add(dedupe_key)
                unique_jobs.append(job)

            total += len(unique_jobs)
            yield json.dumps({
                "type": "jobs",
                "role": completed_role,
                "jobs": unique_jobs,
                "count": len(unique_jobs),
            }) + "\n"

    yield json.dumps({"type": "done", "total": total}) + "\n"


def fetch_jobs_from_api(
    query: str,
    location: str = "remote",
    country: str = "in",
    date_posted: str = "all",
    roles: list[str] | None = None,
):
    """Compatibility endpoint that collects the complete streamed result."""
    jobs = []
    for line in stream_jobs_from_api(query, location, country, date_posted, roles):
        event = json.loads(line)
        if event.get("type") == "jobs":
            jobs.extend(event.get("jobs", []))
        elif event.get("type") == "error":
            raise RuntimeError(event.get("message", "Job search failed."))
    return jobs
