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
    // Sits above the cookie notice's stacking context but below dialogs,
    // and is offset from the bottom-right corner so it does not land on
    // top of the cookie notice's dismiss button on a narrow screen.
    <div className="fixed bottom-4 right-4 z-overlay flex flex-col items-end">
      {open && (
        <div className="card card-elevated mb-3 flex h-[440px] w-[min(340px,calc(100vw-2rem))] animate-scale-in flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-brand-contrast" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
                <path d="M62 150 L100 54 L138 150" />
                <path d="M77 118 L123 118" />
              </svg>
            </span>
            <p className="text-small font-semibold text-ink">Appo Assistant</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-caption leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-brand text-brand-contrast"
                    : "rounded-bl-sm border border-line bg-canvas-subtle text-ink-secondary"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && <div className="text-caption text-ink-muted">Thinking…</div>}
          </div>

          <div className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your app idea…"
              aria-label="Message the Appo assistant"
              className="input text-caption"
            />
            <button onClick={sendMessage} disabled={sending} className="btn btn-primary btn-sm shrink-0">
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close the Appo assistant" : "Open the Appo assistant"}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-lg transition-[transform,border-color] duration-micro ease-out hover:border-line-strong hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brand">
            <path d="M62 150 L100 54 L138 150" />
            <path d="M77 118 L123 118" />
          </svg>
        )}
      </button>
    </div>
  );
}
