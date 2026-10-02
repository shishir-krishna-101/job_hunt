import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from database import SessionLocal
import models

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_EXTRACT_URL = "https://api.tavily.com/extract"
TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def _headers():
    return {
        "Authorization": f"Bearer {TAVILY_API_KEY}",
        "Content-Type": "application/json",
    }


def _extract_url(url: str) -> str:
    response = requests.post(
        TAVILY_EXTRACT_URL,
        headers=_headers(),
        json={"urls": [url]},
        timeout=30,
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Tavily extract returned HTTP {response.status_code}: {response.text[:500]}"
        )

    payload = response.json()
    results = payload.get("results", [])
    if not results:
        raise RuntimeError("Tavily returned no content for this job URL.")

    content = results[0].get("raw_content") or results[0].get("content") or ""
    if not content.strip():
        raise RuntimeError("Tavily returned an empty job page.")
    return content.strip()


def _search_job(title: str, company: str, location: str) -> str:
    query = f'"{title}" "{company}" job {location}'.strip()
    response = requests.post(
        TAVILY_SEARCH_URL,
        headers=_headers(),
        json={
            "query": query,
            "search_depth": "advanced",
            "max_results": 5,
            "include_raw_content": True,
        },
        timeout=30,
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Tavily search returned HTTP {response.status_code}: {response.text[:500]}"
        )

    payload = response.json()
    results = payload.get("results", [])
    if not results:
        raise RuntimeError("Tavily found no matching job page.")

    # Prefer the result with substantial raw content.
    results.sort(
        key=lambda item: len(item.get("raw_content") or item.get("content") or ""),
        reverse=True,
    )
    content = results[0].get("raw_content") or results[0].get("content") or ""
    if not content.strip():
        raise RuntimeError("Tavily found a page but returned no usable content.")
    return content.strip()


def enrich_job(job_db_id: int):
    """Fetch the full JD asynchronously and persist it without blocking search."""
    db = SessionLocal()
    try:
        job = db.query(models.Job).filter(models.Job.id == job_db_id).first()
        if not job:
            return

        if not TAVILY_API_KEY:
            job.enrichment_status = "unavailable"
            job.enrichment_error = "TAVILY_API_KEY is not configured."
            db.commit()
            return

        job.enrichment_status = "enriching"
        job.enrichment_error = None
        db.commit()

        content = ""
        if job.url:
            try:
                content = _extract_url(job.url)
            except Exception:
                # A provider URL may block extraction. Search is a useful fallback.
                content = _search_job(
                    job.title or "",
                    job.company or "",
                    job.location or "",
                )
        else:
            content = _search_job(
                job.title or "",
                job.company or "",
                job.location or "",
            )

        # Keep the original provider description if Tavily somehow returns less.
        if len(content) >= len(job.description or ""):
            job.description = content

        job.enrichment_status = "enriched"
        job.enrichment_error = None
        job.enriched_at = datetime.now(timezone.utc).isoformat()
        db.commit()
    except Exception as exc:
        db.rollback()
        job = db.query(models.Job).filter(models.Job.id == job_db_id).first()
        if job:
            job.enrichment_status = "failed"
            job.enrichment_error = str(exc)
            db.commit()
    finally:
        db.close()
