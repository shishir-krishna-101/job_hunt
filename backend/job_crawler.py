import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"


def fetch_jobs_from_api(query: str, location: str = "remote"):
    """Fetch current jobs through the current JSearch/RapidAPI search-v2 endpoint."""
    if not RAPIDAPI_KEY:
        raise RuntimeError(
            "RAPIDAPI_KEY is not configured. Add your RapidAPI JSearch key "
            "to backend/.env and restart FastAPI."
        )

    querystring = {
        "query": f"{query} in {location}",
        "page": "1",
        "num_pages": "1",
    }
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }

    try:
        response = requests.get(JSEARCH_URL, headers=headers, params=querystring, timeout=20)
    except requests.RequestException as exc:
        raise RuntimeError(f"JSearch request failed: {exc}") from exc

    if response.status_code != 200:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:500]
        raise RuntimeError(f"JSearch returned HTTP {response.status_code}: {detail}")

    payload = response.json()
    return payload.get("data", [])
