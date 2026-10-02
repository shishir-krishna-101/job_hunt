import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

def fetch_jobs_from_api(query: str, location: str = "remote"):
    """
    Fetches real-time jobs using JSearch API (from RapidAPI).
    This acts as our 'crawler' but is much more reliable than scraping HTML,
    which usually gets IP banned.
    """
    if not RAPIDAPI_KEY:
        return []

    url = "https://jsearch.p.rapidapi.com/search"
    querystring = {"query": f"{query} in {location}", "page": "1", "num_pages": "1"}

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)
    if response.status_code == 200:
        return response.json().get('data', [])
    return []
