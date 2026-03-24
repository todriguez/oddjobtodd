"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";

// ── Types ───────────────────────────────────

interface PdfTask {
  description: string;
  location: string | null;
  category: string | null;
  urgency: string | null;
  repairOrReplace: string | null;
  quantityHint: string | null;
}

interface PdfExtraction {
  propertyAddress: string | null;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  agencyName: string | null;
  accessNotes: string | null;
  tasks: PdfTask[];
  overallUrgency: string;
  additionalNotes: string | null;
  confidence: string;
}

interface GapItem {
  field: string;
  label: string;
  importance: "blocking_rom" | "nice_to_have";
  question: string;
}

type Step = "upload" | "review";

// ── Component ───────────────────────────────

export default function ImportJobPage() {
  const [step, setStep] = useState<Step>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<PdfExtraction | null>(null);
  const [jobState, setJobState] = useState<Record<string, any> | null>(null);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [confidence, setConfidence] = useState<string>("medium");

  // Editable fields
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [tasks, setTasks] = useState<PdfTask[]>([]);

  // ── Upload handler ──

  async function handleUpload(file: File) {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("/api/v2/admin/import-job/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setPdfUrl(data.pdfUrl);
      setExtraction(data.extraction);
      setJobState(data.jobState);
      setGaps(data.gaps);
      setConfidence(data.confidence);

      // Populate editable fields
      const ext = data.extraction as PdfExtraction;
      setTenantName(ext.tenantName || "");
      setTenantPhone(ext.tenantPhone || "");
      setTenantEmail(ext.tenantEmail || "");
      setAddress(ext.propertyAddress || "");
      setSuburb(ext.suburb || "");
      setAgencyName(ext.agencyName || "");
      setAgentName(ext.agentName || "");
      setAccessNotes(ext.accessNotes || "");
      setTasks(ext.tasks || []);

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      handleUpload(file);
    } else {
      setError("Please drop a PDF file");
    }
  }

  // ── Confirm handler ──

  async function handleConfirm() {
    if (!jobState || !pdfUrl) return;
    setError(null);
    setIsConfirming(true);

    try {
      // Build updated job state from editable fields
      const updatedState = {
        ...jobState,
        customerName: tenantName || null,
        customerPhone: tenantPhone || null,
        customerEmail: tenantEmail || null,
        address: address || null,
        suburb: suburb || null,
        accessNotes: accessNotes || null,
        pdfImportSource: agencyName || null,
        referringAgentName: agentName || null,
        importedTasks: tasks.map((t) => ({
          description: t.description,
          category: t.category,
          urgency: t.urgency,
          location: t.location,
          repairOrReplace: t.repairOrReplace,
        })),
      };

      const res = await fetch("/api/v2/admin/import-job/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl,
          jobState: updatedState,
          gaps,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create job" }));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      // Redirect to the lead detail page
      window.location.href = `/admin/leads/${data.jobId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsConfirming(false);
    }
  }

  // ── Task editing ──

  function updateTask(index: number, field: keyof PdfTask, value: string | null) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function addTask() {
    setTasks((prev) => [
      ...prev,
      { description: "", location: null, category: null, urgency: null, repairOrReplace: null, quantityHint: null },
    ]);
  }

  // ── Render ──

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <a href="/admin/leads" className="text-blue-600 hover:underline text-sm">
          Leads
        </a>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <h1 className="text-xl font-bold">Import Job from PDF</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600">Extracting data from PDF...</p>
              <p className="text-xs text-gray-400">This may take a moment</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop a PDF job sheet here</p>
              <p className="text-xs text-gray-400 mb-4">or click to browse</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Choose PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === "review" && extraction && (
        <div className="space-y-6">
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Extraction confidence:</span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                confidence === "high"
                  ? "bg-green-100 text-green-800"
                  : confidence === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {confidence.toUpperCase()}
            </span>
          </div>

          {/* Gaps panel */}
          {gaps.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-2">Missing Information</h3>
              <ul className="space-y-1">
                {gaps.map((gap, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        gap.importance === "blocking_rom"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {gap.importance === "blocking_rom" ? "Blocks ROM" : "Nice to have"}
                    </span>
                    <span className="text-amber-900">{gap.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tenant / Customer */}
          <section className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Tenant (Customer)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Property */}
          <section className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Property</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Suburb</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Access Notes</label>
              <input className="w-full border rounded px-2 py-1.5 text-sm" value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} />
            </div>
          </section>

          {/* Agent / Agency */}
          <section className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Referring Agent</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agency</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agent Name</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Tasks */}
          <section className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Tasks ({tasks.length})</h3>
              <button onClick={addTask} className="text-xs text-blue-600 hover:underline">
                + Add task
              </button>
            </div>
            {tasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    value={task.description}
                    onChange={(e) => updateTask(i, "description", e.target.value)}
                    placeholder="Task description"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="border rounded px-2 py-1 text-xs"
                      value={task.location || ""}
                      onChange={(e) => updateTask(i, "location", e.target.value || null)}
                      placeholder="Location (e.g. kitchen)"
                    />
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={task.category || ""}
                      onChange={(e) => updateTask(i, "category", e.target.value || null)}
                    >
                      <option value="">Category</option>
                      {["carpentry", "plumbing", "electrical", "painting", "general", "fencing", "tiling", "roofing", "doors_windows", "gardening", "cleaning", "other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      className="border rounded px-2 py-1 text-xs"
                      value={task.quantityHint || ""}
                      onChange={(e) => updateTask(i, "quantityHint", e.target.value || null)}
                      placeholder="Qty hint"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeTask(i)}
                  className="text-red-400 hover:text-red-600 text-sm mt-1"
                >
                  x
                </button>
              </div>
            ))}
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {isConfirming ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Create Job
            </button>
            <button
              onClick={() => { setStep("upload"); setExtraction(null); setError(null); }}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
