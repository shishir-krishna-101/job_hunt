"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
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
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [jobId, setJobId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedJobId = params.get("job_id") || "";
    if (!selectedJobId) return;

    setJobId(selectedJobId);

    const loadJobWorkspace = async () => {
      try {
        const [resumeResponse, jobResponse] = await Promise.all([
          fetch("http://localhost:8000/api/resume"),
          fetch(`http://localhost:8000/api/jobs/${encodeURIComponent(selectedJobId)}`),
        ]);

        if (resumeResponse.ok) {
          const resumeData = await resumeResponse.json();
          if (resumeData.uploaded) {
            setResume(resumeData.resume_text || "");
            setUploadStatus("success");
          }
        }

        if (jobResponse.ok) {
          const job = await jobResponse.json();
          setJd(job.job_description || "");
          setJobTitle(job.job_title || "Selected job");
          if (job.enrichment_status !== "enriched") {
            setNotice("This job is still being enriched. You can view the listing now and analyze it when the full JD is ready.");
          }
        }
      } catch {
        setNotice("Could not load the selected job workspace.");
      }
    };

    void loadJobWorkspace();
  }, []);

  const uploadResume = async (file: File) => {
    setUploading(true);
    setNotice("");
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("http://localhost:8000/api/resume/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw || "The backend returned an invalid response." };
      }

      if (!response.ok || data?.status === "error") {
        setUploadStatus("error");
        setNotice(
          data?.message || `Resume upload failed (HTTP ${response.status}).`
        );
        return;
      }

      if (data?.status === "success") {
        if (typeof data.resume_text === "string") {
          setResume(data.resume_text);
        }
        setUploadStatus("success");
        setNotice(
          `Resume uploaded successfully — ${data.characters_extracted ?? 0} characters extracted.`
        );
      } else {
        setUploadStatus("error");
        setNotice(data?.message || "Upload failed.");
      }
    } catch (error: any) {
      setUploadStatus("error");
      if (error?.name === "AbortError") {
        setNotice("Resume upload timed out after 30 seconds. Check the FastAPI terminal for an error.");
      } else {
        setNotice("Could not reach FastAPI at http://localhost:8000. Make sure the backend is running.");
      }
    } finally {
      window.clearTimeout(timeout);
      setUploading(false);
    }
  };

  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) {
      setNotice("Upload or paste your resume and add the job description before analyzing.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const url = jobId
        ? `http://localhost:8000/api/jobs/${encodeURIComponent(jobId)}/analyze`
        : "http://localhost:8000/api/resume/analyze";
      const body = jobId ? undefined : JSON.stringify({ resume, jd });

      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: "The backend returned an invalid response." };
      }
      if (!res.ok || data?.error || data?.detail) {
        setResult(null);
        setNotice(data?.details || data?.error || data?.detail || `Analysis failed (HTTP ${res.status}).`);
        return;
      }
      setResult(data);
      setNotice("Analysis complete. The result is stored with this job.");
    } catch (error: any) {
      setResult(null);
      setNotice("Could not reach FastAPI. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const tailorResume = async () => {
    if (!jobId) {
      setNotice("Tailoring from a selected saved job is required for this workflow.");
      return;
    }

    setTailoring(true);
    setNotice("");
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${encodeURIComponent(jobId)}/tailor`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data?.detail || "Resume tailoring failed.");
        return;
      }
      setTailoredResume(data.tailored_resume || "");
      setNotice("Tailored resume generated. Review it before using it.");
    } catch {
      setNotice("Could not reach FastAPI for resume tailoring.");
    } finally {
      setTailoring(false);
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
            <div className="upload-control">
              <button className="secondary-action" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} />
                {uploading ? "Uploading..." : "Upload file"}
              </button>
              {uploadStatus === "success" && (
                <span className="upload-status upload-status-success" title="Resume uploaded and parsed successfully">
                  <CircleCheck size={16} />
                  Ready to analyze
                </span>
              )}
              {uploadStatus === "error" && (
                <span className="upload-status upload-status-error" title="Resume upload failed">
                  <CircleX size={16} />
                  Upload failed
                </span>
              )}
            </div>
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
        <div className="job-links">
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
          {jobId && (
            <button
              className="secondary-action"
              type="button"
              onClick={tailorResume}
              disabled={tailoring || !resume || !jd}
            >
              <Sparkles size={17} />
              {tailoring ? "Tailoring..." : "Tailor resume"}
            </button>
          )}
        </div>
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

      {tailoredResume && (
        <section className="studio-panel" style={{ marginTop: 24 }}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">04 / TAILORED RESUME</span>
              <h2>{jobTitle || "Target role"}</h2>
            </div>
          </div>
          <textarea
            className="studio-textarea"
            style={{ minHeight: 520 }}
            value={tailoredResume}
            onChange={(e) => setTailoredResume(e.target.value)}
          />
          <p className="analysis-copy">
            Review every change. The AI is instructed not to invent employers,
            experience, metrics, certifications, or technologies.
          </p>
        </section>
      )}

      {result && (
        <div className="success-strip">
          <Check size={16} />
          Missing skills are stored locally and can appear in To Explore.
        </div>
      )}
    </div>
  );
}
