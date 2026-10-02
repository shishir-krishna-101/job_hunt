"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  Percent,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";

export default function ResumeStudio() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadResume = async (file: File) => {
    setUploading(true);
    setNotice("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setNotice(
        data.status === "success"
          ? "Resume uploaded and stored locally."
          : data.message || "Upload failed."
      );
    } catch {
      setNotice("Backend is unavailable. Start FastAPI and try again.");
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    setLoading(true);
    setNotice("");

    try {
      const res = await fetch("http://localhost:8000/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setNotice("Analysis failed. Check that the backend and Gemini key are available.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inner-page">
      <header className="inner-hero">
        <div>
          <span className="eyebrow">RESUME WORKSPACE</span>
          <h1>
            Make every
            <br />
            <em>application count.</em>
          </h1>
          <p>
            Compare your resume with a target job, surface missing skills, and
            make intentional ATS improvements without running AI in the background.
          </p>
        </div>
        <div className="hero-note">
          <div className="hero-note-icon"><FileText size={18} /></div>
          <div>
            <span>Local first</span>
            <strong>Upload once. Analyze only when you choose.</strong>
          </div>
        </div>
      </header>

      {notice && <div className="inline-notice inner-notice">{notice}</div>}

      <div className="studio-grid">
        <section className="studio-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">01 / SOURCE</span>
              <h2>Your resume</h2>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadResume(file);
              }}
            />
            <button className="secondary-action" type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} />
              {uploading ? "Uploading..." : "Upload file"}
            </button>
          </div>

          <textarea
            className="studio-textarea"
            placeholder="Paste your resume text here, or upload the file above."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
        </section>

        <section className="studio-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">02 / TARGET</span>
              <h2>Job description</h2>
            </div>
            <span className="panel-meta">One role at a time</span>
          </div>

          <textarea
            className="studio-textarea"
            placeholder="Paste the job description you want to target."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </section>
      </div>

      <div className="studio-cta">
        <div>
          <span className="section-kicker">03 / ANALYZE</span>
          <h2>See where the story needs work.</h2>
        </div>
        <button
          className="search-action"
          type="button"
          onClick={analyze}
          disabled={loading || !resume || !jd}
        >
          <WandSparkles size={17} />
          {loading ? "Analyzing..." : "Analyze match"}
          <ArrowUpRight size={17} />
        </button>
      </div>

      <section className="analysis-layout">
        <div className="analysis-score">
          <span className="section-kicker">MATCH SCORE</span>
          {result ? (
            <>
              <strong>{result.match_percentage}%</strong>
              <p>Based on the resume and job description you supplied.</p>
            </>
          ) : (
            <>
              <strong>—</strong>
              <p>Run an analysis to generate a score and missing-skill list.</p>
            </>
          )}
        </div>

        <div className="analysis-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">AI REVIEW</span>
              <h2>What to improve</h2>
            </div>
            <Sparkles size={18} />
          </div>

          {result ? (
            <div className="analysis-content">
              <div>
                <h3>Missing skills</h3>
                <div className="skill-list">
                  {result.missing_skills?.map((skill: string) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3>Resume feedback</h3>
                <p className="analysis-copy">{result.resume_feedback || "No feedback returned."}</p>
              </div>
            </div>
          ) : (
            <div className="analysis-empty">
              <div className="empty-mark"><Percent size={22} /></div>
              <h3>Nothing has been analyzed yet.</h3>
              <p>AI stays idle until you press Analyze match.</p>
            </div>
          )}
        </div>
      </section>

      {result && (
        <div className="success-strip">
          <Check size={16} />
          Missing skills are stored locally and can appear in To Explore.
        </div>
      )}
    </div>
  );
}
