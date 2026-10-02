"use client";
import { useState } from "react";
import { FileText, Wand2, Percent } from "lucide-react";

export default function ResumeStudio() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText /> Resume Studio</h2>
        <p className="text-gray-600">Paste your resume and a job description to get a match score and ATS fixes.</p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Resume</label>
          <textarea 
            className="w-full h-48 p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your resume text here..."
            value={resume}
            onChange={e => setResume(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Job Description</label>
          <textarea 
            className="w-full h-48 p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the job description here..."
            value={jd}
            onChange={e => setJd(e.target.value)}
          />
        </div>

        <button 
          onClick={analyze}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
          disabled={loading || !resume || !jd}
        >
          {loading ? "Analyzing with AI..." : <><Wand2 className="w-5 h-5"/> Analyze Match & Fix Resume</>}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">AI Analysis</h3>
        {result ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Percent className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Match Score</p>
                <p className="text-2xl font-bold text-blue-700">{result.match_percentage}%</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Missing Skills (Added to Explore tab)</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.missing_skills?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Feedback</h4>
              <p className="text-gray-600 mt-1">{result.resume_feedback}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-center">
            Run the analysis to see your match score, missing skills, and ATS-friendly suggestions.
          </div>
        )}
      </div>
    </div>
  );
}
