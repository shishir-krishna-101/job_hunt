"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, CheckCircle2, Compass, ExternalLink, Sparkles } from "lucide-react";

type Skill = {
  id: number;
  skill_name: string;
  resource_url: string;
};

export default function ExploreTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/explore")
      .then((res) => res.json())
      .then((data) => setSkills(Array.isArray(data) ? data : []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="inner-page">
      <header className="inner-hero">
        <div>
          <span className="eyebrow">SKILL GAPS → SKILL GROWTH</span>
          <h1>
            Your
            <br />
            <em>next things to learn.</em>
          </h1>
          <p>
            Skills that showed up as missing during your resume analyses live
            here, with a resource link attached for the next step.
          </p>
        </div>
        <div className="hero-note">
          <div className="hero-note-icon"><Sparkles size={18} /></div>
          <div>
            <span>Career memory</span>
            <strong>Recurring gaps stay visible instead of getting lost.</strong>
          </div>
        </div>
      </header>

      <div className="explore-summary">
        <div>
          <span className="section-kicker">CURRENT BACKLOG</span>
          <strong>{loading ? "—" : skills.length}</strong>
          <span>skills to explore</span>
        </div>
        <div className="explore-summary-note">
          <Compass size={18} />
          <span>Use each role analysis to grow this list.</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-mark"><BookOpen size={22} /></div>
          <h3>Loading your skill backlog.</h3>
        </div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark"><CheckCircle2 size={22} /></div>
          <span className="section-kicker">ALL CLEAR</span>
          <h3>No recurring gaps yet.</h3>
          <p>Analyze a few target roles from Resume Studio and this space will begin to fill.</p>
          <a className="secondary-action" href="/resume">
            Open Resume Studio <ArrowUpRight size={15} />
          </a>
        </div>
      ) : (
        <div className="explore-grid">
          {skills.map((item) => (
            <article className="explore-card" key={item.id}>
              <div className="explore-icon"><BookOpen size={19} /></div>
              <span className="section-kicker">TO EXPLORE</span>
              <h2>{item.skill_name}</h2>
              <p>Identified from your previous resume / job-description comparison.</p>
              <a href={item.resource_url} target="_blank" rel="noreferrer" className="text-link">
                Learn the skill <ExternalLink size={15} />
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
