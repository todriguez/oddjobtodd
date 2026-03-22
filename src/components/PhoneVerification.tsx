"use client";

import { useState, useRef } from "react";

interface PhoneVerificationProps {
  jobId: string | null;
  onVerified: (customerId: string) => void;
}

/**
 * Inline phone verification component for the chat flow.
 * Sends OTP, verifies code, links customer to job.
 */
export default function PhoneVerification({ jobId, onVerified }: PhoneVerificationProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const isDev = process.env.NODE_ENV === "development";

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) return `+61${digits.slice(1)}`;
    if (digits.startsWith("61")) return `+${digits}`;
    if (digits.startsWith("+")) return raw;
    return `+61${digits}`;
  };

  const sendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v2/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to send code (${res.status})`);
      }

      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v2/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizePhone(phone),
          code: code.trim(),
          ...(jobId ? { jobId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Verification failed (${res.status})`);
      }

      const data = await res.json();
      setStep("done");
      onVerified(data.customerId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
        Phone verified. You can close this page and come back anytime to continue.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      {step === "phone" && (
        <>
          <p className="text-sm text-gray-700">
            Pop in your mobile number and we&apos;ll send you a code — that way you can come back to this conversation later.
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0412 345 678"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
            />
            <button
              onClick={sendCode}
              disabled={loading || !phone.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
          {isDev && (
            <p className="text-xs text-gray-400">Dev mode: code is always 123456</p>
          )}
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-sm text-gray-700">
            Code sent to {phone}. Enter it below:
          </p>
          <div className="flex gap-2">
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <button
            onClick={() => { setStep("phone"); setCode(""); setError(null); }}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Use a different number
          </button>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
