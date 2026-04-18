import React, { useState, useEffect } from 'react';

const AnimatedDots = ({ baseText }) => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(id);
  }, []);
  return <span>{baseText}{dots}</span>;
};

const PipelineProgress = ({ steps, currentStep, isComplete }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-[#0B0F14] text-[#E5E7EB] p-5 rounded-[16px] shadow-2xl border border-white/[0.04] backdrop-blur-xl animate-fadeIn mt-3 transition-all duration-500 transform hover:scale-[1.01]">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-5 flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Smart Pipeline
      </h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const completed = isComplete || index < currentStep;
          const inProgress = !isComplete && index === currentStep;
          const future = !isComplete && index > currentStep;
          
          if (future) return null; // Only render steps as we reach them (progressive feel)

          return (
            <div
              key={step}
              className={`flex items-center gap-3.5 text-[13px] transition-all duration-[600ms] transform ${
                inProgress ? 'opacity-100 translate-x-0 text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 
                completed ? 'opacity-100 translate-x-0 text-[#9CA3AF]' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="shrink-0 flex items-center justify-center w-6 h-6">
                {completed ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="w-3.5 h-3.5 text-emerald-400 animate-fadeIn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                )}
              </div>
              <span className="flex-1 tracking-wide">
                {inProgress ? <AnimatedDots baseText={step} /> : step}
              </span>
            </div>
          );
        })}

        {isComplete && (
          <div className="pt-3 border-t border-white/[0.04] mt-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-[13px] text-emerald-400 font-medium bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 -translate-x-full animate-[shimmer_2s_infinite]"></div>
              <svg className="w-4 h-4 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Preview ready ⚡ Finalizing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineProgress;
