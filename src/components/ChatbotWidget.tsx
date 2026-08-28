"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the appo Assistant. Tell me about the app idea you have, and I'll help you think it through.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error — please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div className="glass-card fade-in mb-3 flex h-[440px] w-[340px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-deep to-fuchsia-500 text-sm">
              ✨
            </span>
            <p className="text-sm font-semibold">appo Assistant</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-gradient-to-r from-violet to-fuchsia-500 text-white"
                    : "rounded-bl-sm border border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && <div className="text-xs text-slate-500">Thinking…</div>}
          </div>

          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your app idea…"
              className="input text-xs"
            />
            <button onClick={sendMessage} disabled={sending} className="btn-accent px-4 text-xs">
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close appo Assistant" : "Open appo Assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-deep via-violet to-fuchsia-500 text-2xl shadow-lg shadow-violet/40 transition hover:scale-105"
      >
        {open ? "✕" : "✨"}
      </button>
    </div>
  );
}
