"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

export default function CopilotClient() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    setError("");
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Copilot failed.");
      return;
    }
    setMessages((m) => [...m, { role: "assistant", text: data.answer, source: data.source }]);
  }

  return (
    <>      <h1 className="text-2xl font-black">AI Business Copilot</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">
        Ask about your business performance. Answers use only your authorized organization data.
        AI-generated answers are labelled as such; without an OPENAI_API_KEY the Copilot returns a calculated summary from real figures.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Conversation">
            <div className="flex min-h-64 flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-sm text-[#8B9BB2]">Try: “How is my business performing?” or “What is my net profit and margin?”</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-[#142B55] text-white" : "border border-[#142B55] bg-[#07111F]"}`}>
                  {m.role === "assistant" && m.source && (
                    <div className="mb-1 text-xs font-bold text-[#80B8FF]">
                      {m.source === "ai-generated" ? "AI-generated answer" : "Calculated summary — no LLM key configured"}
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {loading && <p className="text-sm text-[#8B9BB2]">Thinking…</p>}
            </div>
            <form onSubmit={ask} className="mt-4 flex gap-2">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your business…"
                className="flex-1 rounded-lg border border-[#142B55] bg-[#07111F] px-3 py-2 text-white" />
              <button disabled={loading} className="rounded-lg bg-[#2878FF] px-4 py-2 font-semibold text-white disabled:opacity-50">Ask</button>
            </form>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </Card>
        </div>
        <Card title="What the Copilot can do">
          <ul className="space-y-2 text-sm text-[#8B9BB2]">
            <li>• Explain revenue, profit and margins from real records</li>
            <li>• Analyze sales trends and growth</li>
            <li>• Identify anomalies vs previous months</li>
            <li>• Summarize business reports</li>
            <li>• Explain optimization results</li>
            <li>• Generate recommendations (labelled, never presented as verified numbers)</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
