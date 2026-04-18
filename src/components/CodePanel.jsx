/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx';

const CodePanel = ({ code }) => {
  const [displayed, setDisplayed] = useState('');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  // Typing animation
  useEffect(() => {
    if (!code) {
      setDisplayed('');
      setDone(false);
      return;
    }
    
    setDisplayed('');
    setDone(false);
    
    let currentLength = 0;
    const totalLength = code.length;
    
    // Dynamic typing speed: finishes in ~1.5s max, frame-synced
    const charsPerFrame = Math.max(3, Math.floor(totalLength / 80)); 
    
    let animationFrameId;
    const typeNextChunk = () => {
      // Add random variation to chunk size for 'human' feel
      const chunkVariation = Math.floor(Math.random() * (charsPerFrame / 2));
      currentLength += charsPerFrame + chunkVariation;
      
      if (currentLength >= totalLength) {
        setDisplayed(code);
        setDone(true);
      } else {
        setDisplayed(code.slice(0, currentLength));
        animationFrameId = requestAnimationFrame(typeNextChunk);
      }
    };
    
    animationFrameId = requestAnimationFrame(typeNextChunk);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [code]);

  // Auto-scroll to track rapid typing smoothly
  useEffect(() => {
    if (!done && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayed, done]);

  // Pre-highlight using string logic to avoid heavy DOM mutation per frame
  const highlightedHtml = useMemo(() => {
    if (!displayed) return '';
    return Prism.highlight(displayed, Prism.languages.jsx, 'jsx');
  }, [displayed]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F14] rounded-[16px] border border-white/[0.04] shadow-2xl relative overflow-hidden group">
      {/* Glossy Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.04] shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 opacity-80">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.4)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <h3 className="font-mono text-[13px] font-medium text-[#9CA3AF] tracking-wide uppercase flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Generated.jsx
          </h3>
          {!done && displayed && (
            <span className="flex items-center gap-1.5 ml-2 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Writing
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          disabled={!code || !done}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-300
            ${!code || !done 
              ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/40' 
              : copied 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10 hover:text-white border border-white/[0.04] shadow-sm hover:shadow-md'
            }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-auto p-5 relative z-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {!displayed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9CA3AF] opacity-60 pointer-events-none p-6">
            <svg className="w-12 h-12 mb-4 opacity-50 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p className="text-sm tracking-wide">Ready for generated code...</p>
          </div>
        ) : (
          <pre className="!bg-transparent !m-0 !p-0 relative pb-10">
            <code 
              className="language-jsx !font-mono text-[13px] leading-relaxed block"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
            {!done && (
              <span className="inline-block w-2 h-4 sm:h-5 ml-1 bg-indigo-500 animate-pulse relative top-1 rounded-sm shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </pre>
        )}
        
        {/* Glow Effects (Visible inside code area) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
};

export default CodePanel;
