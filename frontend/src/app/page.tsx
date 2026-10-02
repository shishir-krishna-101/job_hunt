"use client";

import { useState, useRef } from "react";
import { Search, MapPin, Building, Heart, Ban, Sparkles, UploadCloud, ChevronDown, Plus, MoreHorizontal } from "lucide-react";

export default function JobDashboard() {
  const [role, setRole] = useState("DevOps");
  const [location, setLocation] = useState("India");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        alert("Resume successfully uploaded and parsed! AI will now use it to match jobs.");
      } else {
        alert("Failed to parse resume.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to connect to the server.");
    }
    setUploading(false);
  };

  const searchJobs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/jobs/fetch?query=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            JOBS <span className="text-gray-300 font-normal">›</span>
          </h1>
          <nav className="flex space-x-6 h-full items-center">
            <button className="text-[15px] font-semibold border-b-2 border-black h-16 pt-[2px]">Recommended</button>
            <button className="text-[15px] font-medium text-gray-500 hover:text-black flex items-center gap-2">
              Liked <span className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">0</span>
            </button>
            <button className="text-[15px] font-medium text-gray-500 hover:text-black flex items-center gap-2">
              Applied <span className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">0</span>
            </button>
            <button className="text-[15px] font-medium text-gray-500 hover:text-black flex items-center gap-2">
              External <span className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">0</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by title or company"
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 w-72"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchJobs()}
            />
          </div>
          <button className="bg-gradient-to-r from-green-200 to-green-400 text-green-950 font-bold px-5 py-2 rounded-full text-[13px] flex items-center gap-2 hover:opacity-90">
            <Sparkles className="w-4 h-4" /> Upgrade to Turbo: Get Hired Faster ›
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center gap-3 overflow-x-auto shrink-0 shadow-sm z-10">
        <button className="px-3 py-1.5 bg-green-50 text-green-900 border border-green-200 rounded-lg text-sm flex items-center gap-1 font-semibold hover:bg-green-100 transition-colors">
          {location} <ChevronDown className="w-4 h-4 opacity-50"/>
        </button>
        <button className="px-3 py-1.5 bg-green-50 text-green-900 border border-green-200 rounded-lg text-sm flex items-center gap-1 font-semibold hover:bg-green-100 transition-colors">
          {role} (+1) <ChevronDown className="w-4 h-4 opacity-50"/>
        </button>
        <button className="px-3 py-1.5 bg-green-50 text-green-900 border border-green-200 rounded-lg text-sm flex items-center gap-1 font-semibold hover:bg-green-100 transition-colors">
          Mid Level <ChevronDown className="w-4 h-4 opacity-50"/>
        </button>
        <button className="px-3 py-1.5 bg-green-50 text-green-900 border border-green-200 rounded-lg text-sm flex items-center gap-1 font-semibold hover:bg-green-100 transition-colors">
          Full-time <ChevronDown className="w-4 h-4 opacity-50"/>
        </button>
        <button className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm flex items-center gap-1 font-medium hover:bg-gray-50">
          Date Posted <ChevronDown className="w-4 h-4 opacity-50"/>
        </button>
        
        {/* Upload Resume Button directly integrated in the filter bar */}
        <div className="ml-auto flex gap-3">
          <input 
            type="file" 
            accept=".pdf,.doc,.docx" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm flex items-center gap-2 font-semibold hover:bg-black transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Resume"}
          </button>
          <button onClick={() => searchJobs()} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">
            {loading ? "Fetching..." : "Fetch Jobs"}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Job List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-5">
          {jobs.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300 mx-auto max-w-2xl mt-10">
              Upload your resume and click Fetch Matches to load AI-curated listings.
            </div>
          )}

          {jobs.map((job: any) => (
            <div key={job.job_id} className="bg-white rounded-[20px] shadow-sm border border-gray-200 overflow-hidden flex hover:shadow-md transition-shadow max-w-5xl mx-auto">
              
              {/* Card Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-[#0a66c2] text-white flex items-center justify-center font-bold text-2xl rounded-lg shadow-inner shrink-0">
                    {job.employer_name?.charAt(0) || "C"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px] text-teal-600 font-semibold">
                        {job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc).toLocaleDateString() : '3 hours ago'}
                      </span>
                      <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">Early applicant</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">{job.job_title}</h3>
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-5 h-5"/></button>
                    </div>
                    <p className="text-[15px] text-gray-600">{job.employer_name} <span className="text-gray-400 mx-1">/</span> Tech</p>
                    
                    <div className="grid grid-cols-2 gap-y-3 mt-5 text-[14px] text-gray-600 font-medium">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400"/> {job.job_city || job.job_country || location}</div>
                      <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400"/> Full-time</div>
                      <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400"/> Mid Level</div>
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> 2+ years exp</div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[13px] text-gray-400 font-medium">&lt; 25 applicants</span>
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"><Ban className="w-5 h-5"/></button>
                    <button className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full transition-colors"><Heart className="w-5 h-5"/></button>
                    <button className="px-5 py-2.5 bg-gray-50 text-gray-800 font-bold text-[13px] rounded-full flex items-center gap-2 hover:bg-gray-100 transition-colors ml-2">
                      <Sparkles className="w-4 h-4"/> ASK AI
                    </button>
                    <a href={job.job_apply_link} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-[#00e696] text-teal-950 font-bold text-[13px] rounded-full hover:bg-[#00d68a] transition-colors ml-2 text-center">
                      APPLY WITH AUTOFILL
                    </a>
                  </div>
                </div>
              </div>

              {/* Match Score Block */}
              <div className="w-[180px] bg-[#022c22] flex flex-col items-center justify-center p-6 text-white shrink-0">
                <div className="relative w-[90px] h-[90px] mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="45" cy="45" r="41" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="45" cy="45" r="41" fill="transparent" stroke="#00e696" strokeWidth="8" strokeDasharray="257" strokeDashoffset="38" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold">86<span className="text-lg font-semibold">%</span></span>
                  </div>
                </div>
                <span className="text-[11px] font-bold tracking-widest text-[#00e696] mb-1">STRONG MATCH</span>
                <p className="text-[11px] text-gray-300 mt-2 text-center flex items-center gap-1">
                  <span className="text-[#00e696]">✓</span> Comp. & Benefits
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Sidebar (Saved Filters) */}
        <div className="w-[280px] bg-white border-l border-gray-200 p-6 shrink-0 hidden lg:block z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 text-sm">Your Saved Filters</h3>
            <button className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors">
              <Plus className="w-4 h-4"/>
            </button>
          </div>
          <div className="border-l-[3px] border-[#00e696] pl-4 py-1 relative">
            <p className="text-[13px] text-teal-700 font-semibold">{role} + 1 roles, {location}</p>
            <button className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4"/><path d="M13 7 8.7 11.3a2.1 2.1 0 0 0-.6 1.5v3.2c0 .6.4 1 1 1h3.2c.5 0 1-.2 1.5-.6L18 12"/><path d="m18 12 3-3a2.1 2.1 0 0 0-3-3l-3 3"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
