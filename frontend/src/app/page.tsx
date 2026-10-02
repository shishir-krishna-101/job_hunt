"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Clock3,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";

type Job = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_description?: string;
};

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className={`filter-chip ${value ? "filter-chip-active" : ""}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
      {value && value !== "all" && (
        <button
          type="button"
          className="filter-clear"
          aria-label="Clear filter"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }}
        >
          ×
        </button>
      )}
    </label>
  );
}

function MultiRoleFilter({
  roles,
  onChange,
}: {
  roles: string[];
  onChange: (roles: string[]) => void;
}) {
  const options = [
    "DevOps Engineer",
    "Platform Engineer",
    "Cloud Engineer",
    "Site Reliability Engineer",
    "SRE Engineer",
    "Infrastructure Engineer",
    "Cloud/DevOps Engineer",
  ];

  const toggleRole = (role: string) => {
    onChange(
      roles.includes(role)
        ? roles.filter((item) => item !== role)
        : [...roles, role]
    );
  };

  return (
    <details className="multi-role-filter">
      <summary>
        <span>
          {roles.length === 1
            ? roles[0]
            : roles.length
              ? `${roles.length} roles selected`
              : "Select roles"}
        </span>
        <ChevronDown size={14} />
      </summary>
      <div className="multi-role-menu">
        {roles.length > 0 && (
          <button
            type="button"
            className="clear-roles"
            onClick={() => onChange([])}
          >
            Clear all roles
          </button>
        )}
        {options.map((option) => (
          <label key={option} className="role-option">
            <input
              type="checkbox"
              checked={roles.includes(option)}
              onChange={() => toggleRole(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export default function JobDashboard() {
  const [roles, setRoles] = useState<string[]>(["DevOps Engineer"]);
  const [location, setLocation] = useState("Bangalore");
  const [experience, setExperience] = useState("mid-level");
  const [employmentType, setEmploymentType] = useState("FULLTIME");
  const [datePosted, setDatePosted] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeTab, setActiveTab] = useState("Recommended");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/resume/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.uploaded) setUploadStatus("success");
      })
      .catch(() => {
        // The upload control will show a status after the next upload attempt.
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotice("");
    setUploadStatus("idle");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
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
      window.clearTimeout(timeout);

      if (!response.ok || data?.status === "error") {
        setUploadStatus("error");
        setNotice(data?.message || `Resume upload failed (HTTP ${response.status}).`);
        return;
      }
      if (data?.status === "success") {
        setUploadStatus("success");
        setNotice(`Resume uploaded successfully — ${data.characters_extracted ?? 0} characters extracted.`);
      } else {
        setUploadStatus("error");
        setNotice(data?.message || "Resume upload failed.");
      }
    } catch (error: any) {
      console.error(error);
      setUploadStatus("error");
      setNotice(
        error?.name === "AbortError"
          ? "Resume upload timed out after 30 seconds."
          : "Backend is unavailable. Start the FastAPI server and try again."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const searchJobs = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const params = new URLSearchParams({
        query: roles.join(", "),
        location,
        country: "in",
        experience,
        employment_type: employmentType,
        date_posted: datePosted,
        roles: roles.join("|"),
      });
      const response = await fetch(
        `http://localhost:8000/api/jobs/fetch?${params.toString()}`
      );
      const data = await response.json();
      if (!response.ok || data?.status === "error") {
        setJobs([]);
        setNotice(data?.message || `Job search failed (HTTP ${response.status}).`);
        return;
      }
      if (Array.isArray(data)) {
        setJobs(data);
        setNotice(
          data.length
            ? `${data.length} roles found for ${role} in ${location}.`
            : "No roles found for these filters."
        );
      } else {
        setNotice(data?.message || "No jobs were returned.");
      }
    } catch (error) {
      console.error(error);
      setNotice("Could not fetch jobs. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jobs-page">
      <section className="jobs-hero">
        <div>
          <span className="eyebrow">PERSONAL JOB INTELLIGENCE</span>
          <h1>
            Find work that
            <br />
            <em>fits your story.</em>
          </h1>
          <p>
            Search fresh roles, compare the job description with your resume,
            and turn missing skills into a learning plan.
          </p>
        </div>

        <div className="hero-note">
          <div className="hero-note-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <span>Resume-aware search</span>
            <strong>AI runs only when you ask it to.</strong>
          </div>
        </div>
      </section>

      <form className="search-panel" onSubmit={searchJobs}>
        <div className="search-field">
          <Search size={18} />
          <div>
            <label htmlFor="role">ROLE OR COMPANY</label>
            <input
              id="role"
              value={roles.join(", ")}
              onChange={(e) => setRoles(e.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              placeholder="DevOps Engineer, Platform Engineer"
            />
          </div>
        </div>

        <div className="search-divider" />

        <div className="search-field">
          <MapPin size={18} />
          <div>
            <label htmlFor="location">LOCATION</label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="India"
            />
          </div>
        </div>

        <button className="search-action" disabled={loading} type="submit">
          {loading ? "Searching..." : "Search jobs"}
          <ArrowUpRight size={18} />
        </button>
      </form>

      <div className="filter-row">
        <div className="tabs">
          {["Recommended", "Liked", "Applied", "External"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab !== "Recommended" && <span className="tab-count">0</span>}
            </button>
          ))}
        </div>

        <div className="filter-actions">
          <FilterSelect
            value={location}
            onChange={setLocation}
            options={[
              { label: "Any location", value: "" },
              { label: "Bangalore", value: "Bangalore" },
              { label: "Hyderabad", value: "Hyderabad" },
              { label: "Pune", value: "Pune" },
              { label: "Mumbai", value: "Mumbai" },
              { label: "Chennai", value: "Chennai" },
              { label: "Delhi NCR", value: "Delhi NCR" },
              { label: "India", value: "India" },
            ]}
          />
          <MultiRoleFilter roles={roles} onChange={setRoles} />
          <FilterSelect
            value={experience}
            onChange={setExperience}
            options={[
              { label: "Any experience", value: "" },
              { label: "Entry-level", value: "entry-level" },
              { label: "Mid-level", value: "mid-level" },
              { label: "Senior", value: "senior" },
              { label: "All experience", value: "all" },
            ]}
          />
          <FilterSelect
            value={employmentType}
            onChange={setEmploymentType}
            options={[
              { label: "Any work type", value: "" },
              { label: "Full-time", value: "FULLTIME" },
              { label: "Contract", value: "CONTRACTOR" },
              { label: "Part-time", value: "PARTTIME" },
              { label: "Internship", value: "INTERN" },
            ]}
          />
          <FilterSelect
            value={datePosted}
            onChange={setDatePosted}
            options={[
              { label: "Any date", value: "all" },
              { label: "Today", value: "today" },
              { label: "Last 3 days", value: "3days" },
              { label: "Last week", value: "week" },
              { label: "Last month", value: "month" },
            ]}
          />
        </div>
      </div>

      {notice && <div className="inline-notice">{notice}</div>}

      <div className="content-grid">
        <section className="results-column">
          <div className="section-heading">
            <div>
              <span className="section-kicker">OPEN ROLES</span>
              <h2>{activeTab} opportunities</h2>
            </div>
            <span className="result-count">{jobs.length} results</span>
          </div>

          {jobs.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-mark">
                <BriefcaseBusiness size={25} />
              </div>
              <span className="section-kicker">GET STARTED</span>
              <h3>{uploadStatus === "success" ? "No jobs match these filters yet." : "Upload your resume, then search."}</h3>
              <p>
                {uploadStatus === "success"
                  ? "Try clearing experience, work type, or date filters, or choose fewer roles."
                  : "Your resume stays local. Searching jobs does not trigger AI analysis; use the AI actions only when you need them."}
              </p>
              <button
                className="secondary-action"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                {uploading ? "Uploading..." : "Upload resume"}
              </button>
            </div>
          ) : (
            <div className="job-list">
              {jobs.map((job, index) => {
                const company = job.employer_name || "Company";
                const city = job.job_city || job.job_state || job.job_country || location;
                const title = job.job_title || "Untitled role";
                const initial = company.slice(0, 1).toUpperCase();

                return (
                  <article className="job-card" key={job.job_id || index}>
                    <div className="company-mark">{initial}</div>

                    <div className="job-main">
                      <div className="job-topline">
                        <span>{job.job_posted_at_datetime_utc ? "Recently posted" : "Fresh listing"}</span>
                        <span className="status-pill">Open</span>
                      </div>

                      <h3>{title}</h3>
                      <p className="company-name">{company}</p>

                      <div className="job-meta">
                        <span>
                          <MapPin size={14} />
                          {city}
                        </span>
                        <span>
                          <BriefcaseBusiness size={14} />
                          Full-time
                        </span>
                        <span>
                          <Clock3 size={14} />
                          2+ years
                        </span>
                      </div>

                      {job.job_description && (
                        <p className="job-description">
                          {job.job_description.slice(0, 280)}
                          {job.job_description.length > 280 ? "…" : ""}
                        </p>
                      )}

                      <div className="skill-row">
                        {["AWS", "Docker", "Kubernetes", "Terraform"].map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>

                      <div className="job-actions">
                        <span className="job-note">Use Resume Studio for an explicit AI match.</span>
                        <a
                          className="apply-action"
                          href={job.job_apply_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apply
                          <ArrowUpRight size={15} />
                        </a>
                      </div>
                    </div>

                    <aside className="match-card">
                      <div className="match-ring">
                        <span>—</span>
                      </div>
                      <span className="match-label">MATCH</span>
                      <p>Analyze this role against your resume when ready.</p>
                    </aside>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="utility-column">
          <div className="utility-card resume-card">
            <div className="card-eyebrow">
              <span>YOUR RESUME</span>
              <FileText size={16} />
            </div>
            <h3>Keep your profile ready.</h3>
            <p>
              Upload a PDF or Word document once. Matching stays intentional so
              you control API usage.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={handleFileUpload}
            />
            <div className="upload-control">
              <button
                className="dark-action"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                {uploading ? "Uploading..." : "Upload resume"}
              </button>
              {uploadStatus === "success" && (
                <span className="upload-status upload-status-success">
                  <span aria-hidden="true">✓</span> Uploaded
                </span>
              )}
              {uploadStatus === "error" && (
                <span className="upload-status upload-status-error">
                  <span aria-hidden="true">×</span> Upload failed
                </span>
              )}
            </div>
          </div>

          <div className="utility-card">
            <div className="card-eyebrow">
              <span>QUICK FILTER</span>
              <SlidersHorizontal size={16} />
            </div>
            <div className="mini-filter">
              <div>
                <span>Location</span>
                <strong>{location}</strong>
              </div>
              <ChevronDown size={15} />
            </div>
            <div className="mini-filter">
              <div>
                <span>Experience</span>
                <strong>{experience || "Any experience"}</strong>
              </div>
              <ChevronDown size={15} />
            </div>
            <div className="mini-filter">
              <div>
                <span>Work type</span>
                <strong>{employmentType ? employmentType.toLowerCase().replace("fulltime", "full-time") : "Any work type"}</strong>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>

          <div className="utility-card accent-card">
            <span className="section-kicker">NEXT STEP</span>
            <h3>Turn missing skills into progress.</h3>
            <p>See your recurring skill gaps in To Explore.</p>
            <a href="/explore" className="text-link">
              Open To Explore
              <ArrowUpRight size={15} />
            </a>
          </div>

          <div className="source-note">
            <Building2 size={16} />
            <span>Listings are fetched from the configured job data provider.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
