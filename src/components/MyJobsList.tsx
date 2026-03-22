"use client";

import { useState, useEffect } from "react";

interface CustomerJob {
  id: string;
  status: string;
  jobType: string | null;
  scopeSummary: string | null;
  effortBand: string | null;
  lastMessageAt: string;
  createdAt: string;
}

interface MyJobsListProps {
  onResumeJob: (jobId: string) => void;
  onNewEnquiry: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  new_lead: "New",
  qualifying: "In Progress",
  estimate_given: "Estimate Given",
  awaiting_decision: "Awaiting Decision",
  accepted: "Accepted",
  quoted: "Quoted",
  booked: "Booked",
  completed: "Completed",
  declined: "Declined",
  archived: "Archived",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  carpentry: "Carpentry",
  plumbing: "Plumbing",
  electrical: "Electrical",
  painting: "Painting",
  general: "General",
  fencing: "Fencing",
  tiling: "Tiling",
  roofing: "Roofing",
  doors_windows: "Doors & Windows",
  gardening: "Gardening",
  cleaning: "Cleaning",
  other: "Other",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/**
 * Shows the customer's existing jobs for resuming conversations.
 */
export default function MyJobsList({ onResumeJob, onNewEnquiry }: MyJobsListProps) {
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v2/customers/jobs")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Loading your enquiries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={onNewEnquiry} className="mt-3 text-blue-600 text-sm hover:text-blue-800">
          Start a new enquiry instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.length > 0 && (
        <>
          <p className="text-sm text-gray-600">Welcome back! Here are your enquiries:</p>
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => onResumeJob(job.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {job.jobType ? JOB_TYPE_LABELS[job.jobType] || job.jobType : "Enquiry"}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      job.status === "new_lead" ? "bg-blue-50 text-blue-700" :
                      job.status === "completed" ? "bg-green-50 text-green-700" :
                      job.status === "declined" ? "bg-red-50 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(job.lastMessageAt)}</span>
                </div>
                {job.scopeSummary && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{job.scopeSummary}</p>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onNewEnquiry}
        className="w-full py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        {jobs.length > 0 ? "Start a new enquiry" : "Start an enquiry"}
      </button>
    </div>
  );
}
