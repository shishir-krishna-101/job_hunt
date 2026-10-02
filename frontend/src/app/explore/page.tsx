"use client";
import { Compass, ExternalLink } from "lucide-react";

export default function ExploreTab() {
  // Mock data for now until backend DB is fully hooked up
  const missingSkills = [
    { id: 1, skill: "Kubernetes", resource: "https://kubernetes.io/docs/tutorials/" },
    { id: 2, skill: "AWS Lambda", resource: "https://aws.amazon.com/lambda/getting-started/" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Compass /> To Explore</h2>
      <p className="text-gray-600">These are the skills you lacked in your recent job matches. We used AI to find the best resources for you to improve.</p>

      <div className="grid gap-4 mt-6">
        {missingSkills.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{item.skill}</h3>
              <p className="text-sm text-gray-500 mt-1">Identified from: Senior Backend Engineer at TechCorp</p>
            </div>
            <a 
              href={item.resource} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
            >
              Start Learning <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
