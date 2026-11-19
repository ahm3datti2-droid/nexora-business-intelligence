"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Sign-in failed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-6 md:p-8">
        <div className="text-2xl font-black">NEX<span className="text-[#2878FF]">ORA</span></div>
        <h1 className="mt-4 text-xl font-bold">Sign in</h1>
        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#142B55] bg-[#07111F] px-3 py-2 text-white"
        />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#142B55] bg-[#07111F] px-3 py-2 text-white"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button disabled={loading} className="mt-6 w-full rounded-lg bg-[#2878FF] py-2.5 font-semibold text-white disabled:opacity-50">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-[#8B9BB2]">
          No workspace yet? <Link href="/register" className="text-[#80B8FF] underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}
