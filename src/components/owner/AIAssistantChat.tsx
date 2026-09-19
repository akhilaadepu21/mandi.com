'use client';

import { useState } from 'react';
import { Send, Sparkles, ShieldAlert, Loader2 } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'Which dish should I promote?',
  'What is my busiest hour?',
  'Which dishes are not selling?',
  'Which tables take the longest?',
];

export function AIAssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const nextMessages: Msg[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, history: messages }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 503) {
      setNotConfigured(true);
      return;
    }
    if (!res.ok) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Something went wrong: ${data.message ?? 'please try again.'}` }]);
      return;
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
  };

  if (notConfigured) {
    return (
      <div className="rounded-2xl bg-bg-secondary border border-amber-500/20 p-6 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-cream font-medium">AI Assistant isn&apos;t configured</p>
          <p className="text-sm text-cream/50 mt-1">Set the <code className="text-gold">ANTHROPIC_API_KEY</code> environment variable to enable real, data-grounded answers here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-bg-secondary border border-white/5 flex flex-col h-[520px]">
      <div className="flex items-center gap-2 p-4 border-b border-white/5">
        <Sparkles className="w-4 h-4 text-gold" />
        <p className="text-cream font-medium text-sm">Ask about your business</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-cream/50 hover:border-gold/40 hover:text-gold">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-gold text-bg-primary' : 'bg-bg-primary text-cream/80 border border-white/5'}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-cream/40 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="Ask a question about your restaurant…"
          className="flex-1 rounded-full bg-bg-primary border border-white/10 px-4 py-2 text-sm text-cream focus:border-gold/50 outline-none"
        />
        <button onClick={() => ask(input)} disabled={loading} className="p-2.5 rounded-full bg-gold text-bg-primary disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
