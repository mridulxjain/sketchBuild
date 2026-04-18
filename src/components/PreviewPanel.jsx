import React, { useCallback, useEffect, useMemo, useState } from 'react';

const PreviewPanel = ({ code }) => {
  const [fitToScreen, setFitToScreen] = useState(true);
  const [iframeHeight, setIframeHeight] = useState('100%');
  const hasRenderableCode = typeof code === 'string' && code.trim() !== '';

  const prepareSrcDoc = useCallback((sanitizedCode) => {
    const safeCode = sanitizedCode.replace(/<\/script/gi, '<\\/script');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <script>
    (function suppressNoisyWarnings() {
      const originalWarn = console.warn ? console.warn.bind(console) : () => {};
      console.warn = (...args) => {
        const message = String(args[0] || '').toLowerCase();
        if (message.includes('babel') || message.includes('tailwindcss') || message.includes('message port closed')) {
          return;
        }
        originalWarn(...args);
      };
    })();
  </script>
  <!-- Tailwind CDN used intentionally for demo -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      font-family: system-ui, sans-serif;
      background: white;
    }
    #root {
      width: 100%;
      min-height: 100%;
    }
    .actual-size-wrapper {
      width: 100%;
      min-height: 100%;
      padding: 2rem;
    }
    .fit-screen-wrapper {
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    try {
      const observer = new ResizeObserver(() => {
        window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight }, '*');
      });
      window.addEventListener('load', () => observer.observe(document.body));
    } catch (e) {
      console.error('Render error:', e);
    }
  </script>

  <script type="text/babel">
    ${safeCode}

    const root = ReactDOM.createRoot(document.getElementById('root'));

    try {
      if (typeof GeneratedComponent === 'undefined') {
        throw new Error('GeneratedComponent is not defined');
      }

      function PreviewWrapper() {
        const isFit = ${fitToScreen};
        return (
          <div className={isFit ? 'fit-screen-wrapper' : 'actual-size-wrapper'}>
            <GeneratedComponent />
          </div>
        );
      }

      root.render(<PreviewWrapper />);
    } catch (e) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;color:#b91c1c;font-family:system-ui,sans-serif;">Preview unavailable</div>';
      console.error('Render error:', e);
    }
  </script>
</body>
</html>`;
  }, [fitToScreen]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'resize' && !fitToScreen) {
        setIframeHeight(`${Math.max(event.data.height, 500)}px`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fitToScreen]);

  const srcDoc = useMemo(() => {
    if (!hasRenderableCode) {
      return '';
    }

    const sourceCode = code.trim();
    let sanitizedCode = sourceCode
      .replace(/import\s+.*?['"].*?['"];?/g, '') // Strip inline/single line imports
      .replace(/import\s*{[^}]*}\s*from\s*['"].*?['"];?/g, '') // Strip multiline destructured imports
      .replace(/export\s+default\s+\(\)\s*=>/g, 'const GeneratedComponent = () =>')
      .replace(/export\s+default\s+function/g, 'function')
      .replace(/export\s+default\s+class/g, 'class')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+const\s+/g, 'const ')
      .replace(/export\s+function\s+/g, 'function ')
      .replace(/export\s+class\s+/g, 'class ')
      .replace(/export\s+\{([^}]+)\};?/g, '')
      .replace(/h-screen/g, 'h-full')
      .replace(/min-h-screen/g, 'min-h-full');

    // Remove any markdown fencing that slipped through
    sanitizedCode = sanitizedCode.replace(/^```[a-z]*\s*\n?/gi, '').replace(/```\s*$/g, '').trim();

    // If it's just raw JSX starting with < and no functions, wrap it.
    if (!sanitizedCode.includes('function') && !sanitizedCode.includes('const ') && sanitizedCode.startsWith('<')) {
      sanitizedCode = `function GeneratedComponent() {\n  return (\n    ${sanitizedCode}\n  );\n}`;
    }

        let nameMatch = sourceCode.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/) ||
        sourceCode.match(/export\s+default\s+class\s+([A-Za-z0-9_]+)/) ||
        sourceCode.match(/class\s+([A-Z][A-Za-z0-9_]*)/) ||
        sourceCode.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)/) ||
        sourceCode.match(/function\s+([A-Z][A-Za-z0-9_]*)/) ||
        sourceCode.match(/(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/);

      if (nameMatch && nameMatch[1] && nameMatch[1] !== 'GeneratedComponent' && nameMatch[1] !== 'function') {
        const detectedName = nameMatch[1];
        // Replace all instances of the detected name with 'GeneratedComponent'
        sanitizedCode = sanitizedCode.replace(new RegExp(`\\b${detectedName}\\b`, 'g'), 'GeneratedComponent');
      } else {
        // Fallback: If no name found, just try to rename the main export or function or class
        sanitizedCode = sanitizedCode.replace(/(?:export\s+default\s+)?(function|class)(?:\s+([A-Za-z0-9_]+))?\b/, (match, type) => {
          return `${type} GeneratedComponent`;
        });
        
        // Also fallback for const/let/var component arrows that weren't caught
        if (!sanitizedCode.includes('GeneratedComponent')) {
           sanitizedCode = sanitizedCode.replace(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/, 'const GeneratedComponent = () =>');
        }
    }

    if (!sanitizedCode.includes('GeneratedComponent')) {
      sanitizedCode += '\n\nfunction GeneratedComponent() { return <div>Failed to parse component structure</div>; }';
    }

    return prepareSrcDoc(sanitizedCode);
  }, [code, hasRenderableCode, prepareSrcDoc]);

  return (
    <div
      className="bg-white rounded-[16px] border border-white/[0.04] shadow-2xl relative overflow-hidden"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', height: '100%' }}
    >
      {hasRenderableCode && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex bg-[#0B0F14]/70 backdrop-blur-md shadow-2xl border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setFitToScreen(true)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${fitToScreen ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/20' : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'}`}
            >
              Fit
            </button>
            <button
              onClick={() => setFitToScreen(false)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${!fitToScreen ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/20' : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'}`}
            >
              Original
            </button>
          </div>
        </div>
      )}

      {!hasRenderableCode ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#9CA3AF] opacity-60 bg-[#0B0F14] h-full w-full pointer-events-none">
          <svg className="w-12 h-12 text-indigo-400 opacity-50 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm tracking-wide">Live preview will render here</span>
        </div>
      ) : (
        <div className="flex flex-1 relative z-0" style={{ height: fitToScreen ? '100%' : iframeHeight }}>
          <iframe
            key={code + fitToScreen}
            title="Component Preview"
            srcDoc={srcDoc}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', transition: 'height 0.2s ease-in-out' }}
            className="animate-fadeIn flex-1"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
