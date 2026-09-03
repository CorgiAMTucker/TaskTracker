"use client";

import { useEffect, useState } from "react";
import type { BoardDTO } from "@/lib/types";
import { BROKER_REQUESTS_ENABLED } from "@/lib/featureFlags";

type RequestKind = "BROKER_REQUEST" | "TASK";

const BOARD_NAME_BY_KIND: Record<RequestKind, string> = {
  BROKER_REQUEST: "Brokering Requests",
  TASK: "AM Tasks",
};

const TASK_KIND_LABELS: Record<string, string> = {
  ENDORSEMENT: "Endorsement",
  CUSTOMER_QUESTION: "Customer Question",
  OTHER: "Other",
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";

export default function RequestForm({ requireAllFields }: { requireAllFields: boolean }) {
  const [boards, setBoards] = useState<BoardDTO[]>([]);
  const [requestKind, setRequestKind] = useState<RequestKind>(
    BROKER_REQUESTS_ENABLED ? "BROKER_REQUEST" : "TASK"
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [entityFein, setEntityFein] = useState("");
  const [descriptionOfOperations, setDescriptionOfOperations] = useState("");
  const [atlasLink, setAtlasLink] = useState("");
  const [coverageRequested, setCoverageRequested] = useState("");
  const [limitsRequested, setLimitsRequested] = useState("");
  const [preferredAmId, setPreferredAmId] = useState("");

  const [taskKind, setTaskKind] = useState("");
  const [descriptionOfTask, setDescriptionOfTask] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => setBoards(data.boards ?? []));
  }, []);

  const required = requireAllFields;
  const activeBoard = boards.find((b) => b.name === BOARD_NAME_BY_KIND[requestKind]);
  const availableAMs = activeBoard?.availableAMs ?? [];

  function resetForm() {
    setCompanyName("");
    setContactFirstName("");
    setContactLastName("");
    setContactEmail("");
    setContactPhone("");
    setEntityFein("");
    setDescriptionOfOperations("");
    setAtlasLink("");
    setCoverageRequested("");
    setLimitsRequested("");
    setPreferredAmId("");
    setTaskKind("");
    setDescriptionOfTask("");
    setFile(null);
    setUploadedFile(null);
    setUploadError(null);
    setStatus("idle");
    setError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setUploadedFile(null);
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", selected);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error ?? "Couldn't upload that file. Please try again.");
        setFile(null);
        return;
      }
      const data = await res.json();
      setUploadedFile({ url: data.url, name: data.name });
    } catch {
      setUploadError("Couldn't upload that file. Please try again.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKind,
          preferredAmId: preferredAmId || undefined,
          companyName: companyName || undefined,
          contactFirstName: contactFirstName || undefined,
          contactLastName: contactLastName || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          entityFein: entityFein || undefined,
          descriptionOfOperations: descriptionOfOperations || undefined,
          atlasLink: atlasLink || undefined,
          coverageRequested: coverageRequested || undefined,
          limitsRequested: limitsRequested || undefined,
          questionnaireFileUrl: uploadedFile?.url,
          questionnaireFileName: uploadedFile?.name,
          taskKind: taskKind || undefined,
          descriptionOfTask: descriptionOfTask || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Request submitted</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thanks — your request has been filed and assigned to a team member.
        </p>
        <button
          onClick={resetForm}
          className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const submitDisabled =
    status === "submitting" ||
    uploading ||
    (required && requestKind === "BROKER_REQUEST" && !uploadedFile);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-slate-900">File a request</h1>

      {BROKER_REQUESTS_ENABLED && (
        <label className={`mt-6 ${labelClass}`}>
          Request Type
          <select
            value={requestKind}
            onChange={(e) => setRequestKind(e.target.value as RequestKind)}
            className={inputClass}
          >
            <option value="BROKER_REQUEST">Broker Request</option>
            <option value="TASK">Task</option>
          </select>
        </label>
      )}

      {BROKER_REQUESTS_ENABLED && requestKind === "BROKER_REQUEST" ? (
        <>
          <label className={`mt-4 ${labelClass}`}>
            Company Name
            <input
              required={required}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Contact First Name
              <input
                required={required}
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact Last Name
              <input
                required={required}
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Contact Email
              <input
                type="email"
                required={required}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact Phone Number
              <input
                required={required}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <label className={`mt-4 ${labelClass}`}>
            Entity FEIN <span className="font-normal text-slate-400">(put &quot;N/A&quot; if in questionnaire)</span>
            <input
              required={required}
              value={entityFein}
              onChange={(e) => setEntityFein(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`mt-4 ${labelClass}`}>
            Description of Operations
            <textarea
              required={required}
              rows={3}
              value={descriptionOfOperations}
              onChange={(e) => setDescriptionOfOperations(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`mt-4 ${labelClass}`}>
            Atlas Link
            <input
              required={required}
              value={atlasLink}
              onChange={(e) => setAtlasLink(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Coverage Requested
              <input
                required={required}
                value={coverageRequested}
                onChange={(e) => setCoverageRequested(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Limits Requested
              <input
                required={required}
                value={limitsRequested}
                onChange={(e) => setLimitsRequested(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <label className={`mt-4 ${labelClass}`}>
            Completed Questionnaire
            <input
              type="file"
              required={required && !uploadedFile}
              onChange={handleFileChange}
              className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm`}
            />
          </label>
          {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
          {uploadedFile && (
            <p className="mt-1 text-xs text-green-600">Uploaded: {uploadedFile.name}</p>
          )}
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </>
      ) : (
        <>
          <label className={`mt-4 ${labelClass}`}>
            Task Type
            <select
              required={required}
              value={taskKind}
              onChange={(e) => setTaskKind(e.target.value)}
              className={inputClass}
            >
              <option value="">Select…</option>
              {Object.entries(TASK_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={`mt-4 ${labelClass}`}>
            Description of Task
            <textarea
              required={required}
              rows={3}
              value={descriptionOfTask}
              onChange={(e) => setDescriptionOfTask(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`mt-4 ${labelClass}`}>
            Company Name <span className="font-normal text-slate-400">(optional)</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`mt-4 ${labelClass}`}>
            Atlas Link <span className="font-normal text-slate-400">(optional)</span>
            <input
              value={atlasLink}
              onChange={(e) => setAtlasLink(e.target.value)}
              className={inputClass}
            />
          </label>
        </>
      )}

      <label className={`mt-4 ${labelClass}`}>
        Preferred AM <span className="font-normal text-slate-400">(optional — skips round robin)</span>
        <select
          value={preferredAmId}
          onChange={(e) => setPreferredAmId(e.target.value)}
          className={inputClass}
        >
          <option value="">No preference</option>
          {availableAMs.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitDisabled}
        className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
