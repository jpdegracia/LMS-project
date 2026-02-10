import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import labbie from '../../assets/labbie.jpg';

const image = new Image();
image.src = labbie;

const GeminiAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  // Auto-scroll to bottom when response updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, loading]);

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    setPrompt(''); // Clear input like a real chat
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch(`${BACKEND_URL}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResponse(data.text);
    } catch (error) {
      setResponse("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden ">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-lg">
            <img src={labbie} alt="Labbie" className="h-12 w-12" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Careerlab Labbie</h2>
            <p className="text-xs text-blue-100">Powered by Gemini AI</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {!response && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-60">
            <Bot size={48} />
            <p className="text-center italic">Hello! I'm your AI tutor. <br /> Ask me to explain a concept or summarize your lessons.</p>
          </div>
        )}

        {/* User Question (if there's a response or loading) */}
        {response || loading ? (
          <div className="flex gap-3 justify-end">
             <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
                <p className="text-sm">Your Question</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User size={16} className="text-blue-600" />
             </div>
          </div>
        ) : null}

        {/* AI Response Area */}
        {(loading || response) && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm">
              {loading ? (
                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="prose prose-indigo prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleAskAI} className="relative flex items-center">
          <textarea
            rows="1"
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-slate-700 placeholder:text-gray-400"
            placeholder="Type your study question here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskAI(e)}
          />
          <button 
            type="submit" 
            disabled={loading || !prompt.trim()}
            className={`absolute right-2 p-2 rounded-lg transition-all
              ${loading || !prompt.trim() 
                ? 'text-gray-300' 
                : 'text-white bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95'}`}
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          AI-generated content may be inaccurate. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default GeminiAssistant;