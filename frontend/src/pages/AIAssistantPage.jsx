import React, { useState, useEffect } from 'react';
import { Terminal, Send, Bot, User, Sparkles, BookOpen, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your AIOps Engineering Copilot. Ask me about cluster health, incident root causes, or mitigation runbooks.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [slmStatus, setSlmStatus] = useState({ status: 'checking', provider: 'Ollama', model: 'qwen2.5:1.5b' });

  useEffect(() => {
    fetch('/api/v1/ai/health')
      .then(res => res.json())
      .then(data => setSlmStatus(data))
      .catch(() => setSlmStatus({ status: 'offline', provider: 'Ollama', message: 'Fallback Engine Active' }));
  }, []);

  const samplePrompts = [
    "Why is checkout-service degraded?",
    "What caused incident INC-4103?",
    "What runbook should I follow for CPU saturation?",
    "Show me evidence for the current RCA."
  ];

  const handleSend = async (userMsg) => {
    const textToSend = userMsg || input;
    if (!textToSend.trim() || loading) return;

    setMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    if (!userMsg) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: data.response || "No response received.",
        source: data.source,
        rag: data.rag_sources,
        context_incident: data.context_incident
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "The backend API is not reachable. Start it with: uvicorn backend.app.main:app --port 8000, then ask again.",
        source: "Network error (no data available)",
        rag: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-mono text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
            <Terminal className="w-5 h-5 text-blue-400" />
            SLM Engineering Copilot Workspace
          </h2>
          <p className="text-slate-400 font-sans text-xs">Natural language telemetry queries, RCA explanation & runbook retrieval (demo template, no external model)</p>
        </div>

        <div className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
          slmStatus.ollama === 'online' || slmStatus.status === 'online'
            ? 'bg-purple-950 text-purple-300 border-purple-500/30'
            : 'bg-slate-900 text-slate-400 border-white/10'
        }`}>
          ● SLM {slmStatus.ollama === 'online' ? 'ONLINE' : 'DEMO TEMPLATE'}
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-[11px] transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Chat Box */}
      <div className="tech-panel rounded-xl flex flex-col h-[520px]">
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'assistant' && (
                <div className="p-1.5 rounded bg-blue-950 border border-blue-500/30 text-blue-400 self-start">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-xl p-3.5 rounded-lg text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none font-sans'
                  : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none space-y-2'
              }`}>
                <p>{m.text}</p>

                {m.source && (
                  <div className="text-[10px] font-mono text-purple-300 pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Source: {m.source}</span>
                    {m.context_incident && <span>Target: {m.context_incident}</span>}
                  </div>
                )}

                {m.rag && m.rag.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-400 space-y-1 font-mono">
                    <span className="font-bold text-purple-300 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Retrieved RAG Sources:
                    </span>
                    {m.rag.map((r, rIdx) => (
                      <div key={rIdx} className="p-1.5 bg-slate-950 rounded border border-white/5">
                        <span className="font-bold text-slate-200">{r.title}: </span>
                        <span className="text-slate-400">{r.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {m.sender === 'user' && (
                <div className="p-1.5 rounded bg-purple-950 border border-purple-500/30 text-purple-400 self-start">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="p-1.5 rounded bg-blue-950 border border-blue-500/30 text-blue-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-400 font-mono">
                Querying RAG & generating explanation...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-white/10 bg-slate-950 flex gap-2 rounded-b-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about active telemetry, incidents, or runbooks..."
            className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 font-sans text-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
