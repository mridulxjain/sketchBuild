import React, { useEffect, useRef, useState } from 'react';
import Canvas from './components/Canvas';
import CodePanel from './components/CodePanel';
import PreviewPanel from './components/PreviewPanel';
import InputModeSwitcher from './components/InputModeSwitcher';
import ImageUpload from './components/ImageUpload';
import PipelineProgress from './components/PipelineProgress';
import { useVisionAPI } from './hooks/useVisionAPI';
import { exportCanvasAsBase64, isCanvasBlank } from './utils/canvasExport';

const API_FAILURE_FALLBACK = `function GeneratedComponent() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
        <h2 className="text-base font-semibold">Could not generate component</h2>
        <p className="mt-2 text-sm">
          The API request failed or was rate limited. Please wait a few seconds and try again.
        </p>
      </div>
    </div>
  );
}`;

const FAKE_PIPELINE_STEPS = [
  'Analyzing sketch structure',
  'Detecting UI components',
  'Understanding layout hierarchy',
  'Generating component logic',
  'Applying styling and spacing',
  'Finalizing preview'
];

export default function App() {
  const [generatedCode, setGeneratedCode] = useState('');
  const [activeTab, setActiveTab] = useState('preview');
  const [activeInputMode, setActiveInputMode] = useState('draw');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [textPrompt, setTextPrompt] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDebouncingGenerate, setIsDebouncingGenerate] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [currentPipelineStep, setCurrentPipelineStep] = useState(-1);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);

  const canvasRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // Pipeline tracking refs
  const pipelineRunIdRef = useRef(0);
  const apiStatusRef = useRef({ done: false, success: false });

  const { generateFast, error, setError, isRateLimited } = useVisionAPI();

  const isLoading = isGenerating;

  // Added a little random helper for timings
  const randomDelay = (base, variance) => Math.floor(base + Math.random() * variance);

  useEffect(() => {
    const suppressPortClosedError = (event) => {
      const message = String(event?.message || event?.reason?.message || event?.reason || '').toLowerCase();
      if (message.includes('message port closed before a response was received') || message.includes('message port closed')) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('error', suppressPortClosedError, true);
    window.addEventListener('unhandledrejection', suppressPortClosedError, true);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pipelineRunIdRef.current += 1;
      window.removeEventListener('error', suppressPortClosedError, true);
      window.removeEventListener('unhandledrejection', suppressPortClosedError, true);
    };
  }, []);

  const stopFakePipeline = (hide = true) => {
    pipelineRunIdRef.current += 1; // Cancels any running pipeline loop
    
    if (hide) {
      setShowPipeline(false);
      setCurrentPipelineStep(-1);
      setIsPipelineComplete(false);
    }
  };

  const startFakePipelineAsync = async () => {
    stopFakePipeline(true);
    setShowPipeline(true);
    setIsPipelineComplete(false);
    setCurrentPipelineStep(0);
    
    pipelineRunIdRef.current += 1;
    const currentRunId = pipelineRunIdRef.current;
    
    // We don't block the UI, we just let this loop run the visual state
    for (let i = 0; i < FAKE_PIPELINE_STEPS.length; i++) {
        if (pipelineRunIdRef.current !== currentRunId) return; // Cancelled
        
        setCurrentPipelineStep(i);
        
        // Base smart timings for each exact step
        let delay;
        if (i === 0) delay = randomDelay(500, 200);      // Analyzing
        else if (i === 1) delay = randomDelay(700, 300); // Detecting
        else if (i === 2) delay = randomDelay(800, 300); // Hierarchy
        else if (i === 3) delay = randomDelay(900, 400); // Generating
        else if (i === 4) delay = randomDelay(600, 300); // Styling
        else delay = randomDelay(400, 200);              // Finalizing
        
        // If API is already done early, we fast forward seamlessly but DO NOT skip steps entirely
        if (apiStatusRef.current.done) {
            delay = randomDelay(200, 100); 
        }

        // Must await a minimum visual frame before moving
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    
    // If the pipeline visually finishes but the API is still actually processing, Wait for it!
    while (!apiStatusRef.current.done && pipelineRunIdRef.current === currentRunId) {
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (pipelineRunIdRef.current === currentRunId) {
       setIsPipelineComplete(true);
    }
  };

  const handleModeChange = (mode) => {
    setActiveInputMode(mode);
    setGeneratedCode('');
    setError(null);
    stopFakePipeline(true);
    if (mode === 'draw') {
      setUploadedImage(null);
    }
  };

  const runGeneration = async () => {
    setError(null);
    setGeneratedCode('');
    let base64 = '';

    if (activeInputMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (isCanvasBlank(canvas)) {
        setError('Please draw something on the canvas first.');
        return;
      }
      base64 = exportCanvasAsBase64(canvas);
    } else {
      if (!uploadedImage || !uploadedImage.base64) {
        setError('Please upload an image first!');
        return;
      }
      base64 = uploadedImage.base64;
    }

    setIsGenerating(true);
    apiStatusRef.current = { done: false, success: false };
    
    // Launch visual pipeline completely asynchronously
    startFakePipelineAsync();

    try {
      const jsx = await generateFast(base64, textPrompt);
      if (jsx) {
        setGeneratedCode(jsx);
        setActiveTab('preview');
        apiStatusRef.current = { done: true, success: true };
      } else {
        setGeneratedCode(API_FAILURE_FALLBACK);
        setActiveTab('preview');
        apiStatusRef.current = { done: true, success: false };
        stopFakePipeline(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (isLoading || isDebouncingGenerate || isRateLimited) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsDebouncingGenerate(true);
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncingGenerate(false);
      void runGeneration();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E5E7EB] flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="shrink-0 border-b border-white/[0.08] bg-[#0B0F14]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-semibold text-white tracking-wide">sketchBuild</span>
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Groq · Llama 3 Vision
            </span>
          </div>
          <p className="hidden md:block text-sm text-[#9CA3AF] font-medium">
            Draw wireframe <span className="opacity-50 mx-1.5">→</span> Get React code instantly
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="flex flex-col gap-6">
          <div className="bg-[#111827] rounded-3xl border border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-6 flex flex-col gap-5 h-full">
            <InputModeSwitcher mode={activeInputMode} onModeChange={handleModeChange} />
            
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E5E7EB] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] inline-block" />
                {activeInputMode === 'draw' ? 'Design Canvas' : 'Design Upload'}
              </h2>
              <span className="text-xs text-[#9CA3AF]">
                {activeInputMode === 'draw' ? 'Sketch your UI wireframe' : 'Upload your UI design'}
              </span>
            </div>

            <div className="flex-grow flex flex-col min-h-0">
              {activeInputMode === 'draw' ? (
                <Canvas ref={canvasRef} onClear={() => setError(null)} />
              ) : (
                <ImageUpload 
                  uploadedImage={uploadedImage} 
                  onImageUpload={setUploadedImage} 
                  clearImage={() => { setUploadedImage(null); setError(null); }} 
                />
              )}
            </div>

            <div className="mt-1">
              <input
                type="text"
                placeholder="Optional prompts: e.g., 'Make it a dark theme', 'Use standard padding'"
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-black/40 text-white placeholder:text-[#9CA3AF] transition-all duration-200"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slideUp">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
                <span className="flex-1 leading-relaxed">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-red-500/60 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading || isDebouncingGenerate || isRateLimited}
              className={`
                relative w-full py-3.5 px-5 rounded-xl font-semibold text-white text-[15px]
                flex items-center justify-center gap-2 overflow-hidden shrink-0 mt-2
                transition-none active:scale-100
                focus:outline-none
                ${isLoading
                  ? 'bg-indigo-600 cursor-wait opacity-90'
                  : 'bg-indigo-600 hover:bg-indigo-500'
                }
              `}
            >
              {isLoading ? (
                <>
                  Processing...
                </>
              ) : isRateLimited ? (
                <>Cooling down...</>
              ) : isDebouncingGenerate ? (
                <>Preparing...</>
              ) : (
                <>
                  {activeInputMode === 'draw' ? 'Generate Component' : 'Generate from Image'}
                </>
              )}
            </button>
            
            {showPipeline && (
              <PipelineProgress
                steps={FAKE_PIPELINE_STEPS}
                currentStep={currentPipelineStep}
                isComplete={isPipelineComplete}
              />
            )}
          </div>

        </div>

        <div className="flex flex-col rounded-3xl border border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden bg-[#111827] h-full min-h-[580px]">
          <div className="flex items-center gap-2 p-2 bg-[#0B0F14]/50 border-b border-white/[0.06]">
            {['preview', 'code'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium
                  transition-all duration-300
                  ${activeTab === tab
                    ? 'bg-[#2A2B3D]/60 text-white shadow-sm border border-white/10'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {tab === 'preview' ? 'Preview' : 'Code'}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'code'
              ? <CodePanel code={generatedCode} />
              : <PreviewPanel code={generatedCode} />
            }
          </div>
        </div>
      </main>

    </div>
  );
}
