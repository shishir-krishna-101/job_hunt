# AI Job Hunt Assistant

## Overview
This project is an AI-powered job search assistant similar to JobRight.ai. It runs locally and helps you find jobs, match them against your resume, and identify skills you need to improve.

## Features
- **Local Database**: Stores jobs, your resume, and skill progress using SQLite.
- **Job Crawler/Fetcher**: Fetches recently posted jobs aligning with your resume.
- **AI Matcher**: Compares job descriptions with your resume, calculates a match percentage, and suggests resume tweaks.
- **To Explore Tab**: Tracks skills you lack for the jobs you're interested in and provides learning resources (URLs) to improve them.

## Prerequisites & Free API Keys Needed
To make this work reliably without getting blocked by anti-bot systems, we use free APIs:

1. **LLM / AI Model (Gemini API)**
   - **Why**: To compare your resume with job descriptions, calculate the match percentage, extract missing skills, and suggest resume edits.
   - **Get it**: [Google AI Studio](https://aistudio.google.com/) (Free tier available)

2. **Job Fetching (JSearch API via RapidAPI)**
   - **Why**: Scraping job boards directly (like LinkedIn/Indeed) usually results in IP bans and captchas. JSearch provides a clean API for real-time job listings from Google Jobs.
   - **Get it**: [JSearch on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QvdB/api/jsearch) (Free tier: 500 requests/month)

3. **Resource Search (Tavily API or Google Custom Search)**
   - **Why**: To automatically find the best courses, documentation, or articles for the skills in your "To Explore" tab.
   - **Get it**: [Tavily AI](https://tavily.com/) (Free tier: 1,000 searches/month)

## Tech Stack
- **Backend**: FastAPI (Python), SQLite, SQLAlchemy
- **Frontend**: Next.js, React, Tailwind CSS
- **AI Integration**: Google Generative AI SDK

## Next Steps
Create a `.env` file in the `backend` directory once you have these keys:
```env
GEMINI_API_KEY=your_gemini_key
RAPIDAPI_KEY=your_rapidapi_key
TAVILY_API_KEY=your_tavily_key
```
