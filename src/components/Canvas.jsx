import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

const Canvas = forwardRef(({ onClear }, ref) => {
  const containerRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  
  const [tool, setTool] = useState('brush'); // brush, rectangle, circle, line, bucket, eraser
  const [strokeColor, setStrokeColor] = useState('#1a1a1a');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2.5);
  
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const colors = [
    { label: 'Black', value: '#1a1a1a' },
    { label: 'White', value: '#ffffff' },
    { label: 'Slate', value: '#64748b' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Yellow', value: '#eab308' },
  ];

  const sizes = [
    { label: 'Thin', value: 1.5, sizeClass: 'w-1 h-1' },
    { label: 'Normal', value: 2.5, sizeClass: 'w-2 h-2' },
    { label: 'Thick', value: 5.0, sizeClass: 'w-3 h-3' },
  ];

  // We only expose the main canvas to the parent for exporting
  useImperativeHandle(ref, () => mainCanvasRef.current);

  const fillWhite = (canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const applyCtx = (ctx, isEraser = false) => {
    if (isEraser) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lineWidth * 3; // Eraser is a bit bigger
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = lineWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const getDPI = () => window.devicePixelRatio || 1;

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!mainCanvas || !overlayCanvas) return;
    const container = containerRef.current;
    
    // Physical pixel calculation
    const initSize = (canvas, w, h, dpi) => {
      canvas.width = w * dpi;
      canvas.height = h * dpi;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext('2d').scale(dpi, dpi);
    };

    const containerW = container?.clientWidth || 800;
    const containerH = 480;
    const dpi = getDPI();

    initSize(mainCanvas, containerW, containerH, dpi);
    initSize(overlayCanvas, containerW, containerH, dpi);
    fillWhite(mainCanvas);

    const handleResize = () => {
      const newW = container?.clientWidth;
      if (!newW) return;
      const snapshot = mainCanvas.toDataURL('image/png');
      const curDpi = getDPI();
      
      initSize(mainCanvas, newW, containerH, curDpi);
      initSize(overlayCanvas, newW, containerH, curDpi);
      fillWhite(mainCanvas);
      
      const img = new Image();
      img.onload = () => {
        const ctx = mainCanvas.getContext('2d');
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Ignore scaling for exact physical pixel copy
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      };
      img.src = snapshot;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPos = (e) => {
    const canvas = overlayCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] ?? e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  };

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255]; // R, G, B, A
  };

  // Stack-based flood fill
  const floodFill = (x, y, targetColorHex) => {
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Coordinates in physical pixels!
    const dpi = getDPI();
    const px = Math.round(x * dpi);
    const py = Math.round(y * dpi);
    const width = canvas.width;
    const height = canvas.height;
    
    if (px < 0 || px >= width || py < 0 || py >= height) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const targetColor = hexToRgb(targetColorHex);
    const startPos = (py * width + px) * 4;
    const startColor = [
      data[startPos],
      data[startPos + 1],
      data[startPos + 2],
      data[startPos + 3]
    ];

    if (Math.abs(startColor[0] - targetColor[0]) < 5 &&
        Math.abs(startColor[1] - targetColor[1]) < 5 &&
        Math.abs(startColor[2] - targetColor[2]) < 5) {
      return; 
    }

    const matchStartColor = (pos) => {
      // 10 color tolerance difference for anti-aliased gaps
      return Math.abs(data[pos] - startColor[0]) <= 10 &&
             Math.abs(data[pos + 1] - startColor[1]) <= 10 &&
             Math.abs(data[pos + 2] - startColor[2]) <= 10 &&
             Math.abs(data[pos + 3] - startColor[3]) <= 10;
    };

    const colorPixel = (pos) => {
      data[pos] = targetColor[0];
      data[pos + 1] = targetColor[1];
      data[pos + 2] = targetColor[2];
      data[pos + 3] = targetColor[3];
    };

    const pixelStack = [[px, py]];
    
    while (pixelStack.length > 0) {
      const [currX, currY] = pixelStack.pop();
      let yTemp = currY;
      let pixelPos = (yTemp * width + currX) * 4;
      
      while (yTemp >= 0 && matchStartColor(pixelPos)) {
        yTemp--;
        pixelPos -= width * 4;
      }
      pixelPos += width * 4;
      yTemp++;
      
      let reachLeft = false;
      let reachRight = false;
      
      while (yTemp < height && matchStartColor(pixelPos)) {
        colorPixel(pixelPos);
        
        if (currX > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([currX - 1, yTemp]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }
        
        if (currX < width - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([currX + 1, yTemp]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }
        
        yTemp++;
        pixelPos += width * 4;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
  };

  const drawShape = (ctx, start, cur, shouldFill) => {
    const w = cur.x - start.x;
    const h = cur.y - start.y;
    
    ctx.beginPath();
    
    if (tool === 'rectangle') {
      ctx.rect(start.x, start.y, w, h);
    } else if (tool === 'circle') {
      const radiusX = Math.abs(w) / 2;
      const radiusY = Math.abs(h) / 2;
      const radius = Math.max(radiusX, radiusY); // Perfect circle based on max drag
      const cx = start.x + w / 2;
      const cy = start.y + h / 2;
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    } else if (tool === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(cur.x, cur.y);
    }
    
    if (tool !== 'line' && shouldFill && fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    
    if (tool === 'bucket') {
      floodFill(pos.x, pos.y, fillColor);
      return;
    }

    isDrawing.current = true;
    startPos.current = pos;

    const canvas = (tool === 'brush' || tool === 'eraser') ? mainCanvasRef.current : overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    applyCtx(ctx, tool === 'eraser');
    
    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getPos(e);

    if (tool === 'brush' || tool === 'eraser') {
      const ctx = mainCanvasRef.current.getContext('2d');
      // Fix context dropping properties if redrawn too fast by enforcing it:
      applyCtx(ctx, tool === 'eraser');
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // Shape Preview
      const oCanvas = overlayCanvasRef.current;
      const oCtx = oCanvas.getContext('2d');
      // Clear physical overlay bounds via transparent fill or clearRect preserving transform matrix
      oCtx.clearRect(0, 0, oCanvas.width / getDPI(), oCanvas.height / getDPI());
      applyCtx(oCtx);
      drawShape(oCtx, startPos.current, pos, true);
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (tool === 'brush' || tool === 'eraser') {
      mainCanvasRef.current.getContext('2d').closePath();
    } else {
      // Finalize shaped
      const pos = getPos(e);
      const mCtx = mainCanvasRef.current.getContext('2d');
      applyCtx(mCtx);
      drawShape(mCtx, startPos.current, pos, true);
      
      const oCanvas = overlayCanvasRef.current;
      oCanvas.getContext('2d').clearRect(0, 0, oCanvas.width / getDPI(), oCanvas.height / getDPI());
    }
  };

  const clearAll = () => {
    if (mainCanvasRef.current) fillWhite(mainCanvasRef.current);
    if (onClear) onClear();
  };

  // SVGs for Tools
  const IconBrush = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />;
  const IconRect = () => <rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />;
  const IconCircle = () => <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />;
  const IconLine = () => <path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" />;
  const IconBucket = () => <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 20.8A2.5 2.5 0 0117 18.3c0-1.4 1-2.5 2.5-3.3 1.5.8 2.5 1.9 2.5 3.3a2.5 2.5 0 01-2.5 2.5zM4 11l4-4m1.4 8.6L4.8 20.2c-.8.8-2 .8-2.8 0s-.8-2 0-2.8l4.6-4.6M14 6l-6 6" />;
  const IconEraser = () => <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;

  const getToolIcon = (t) => {
    switch (t) {
      case 'brush': return <IconBrush />;
      case 'rectangle': return <IconRect />;
      case 'circle': return <IconCircle />;
      case 'line': return <IconLine />;
      case 'bucket': return <IconBucket />;
      case 'eraser': return <IconEraser />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full" ref={containerRef}>
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
        
        {/* Tools Left */}
        <div className="flex items-center gap-1">
          {['brush', 'rectangle', 'circle', 'line', 'bucket', 'eraser'].map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center
                ${tool === t ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {getToolIcon(t)}
              </svg>
            </button>
          ))}
        </div>
        
        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-slate-200" />
        
        {/* Tools Center (Colors) */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Stroke</span>
            <input 
              type="color" 
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              style={{ backgroundColor: strokeColor }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Fill</span>
            <input 
              type="color" 
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              style={{ backgroundColor: fillColor }}
            />
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-4">
            {colors.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => {
                  if (tool === 'bucket') setFillColor(c.value);
                  else setStrokeColor(c.value);
                }}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border border-black/10`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-slate-200" />

        {/* Tools Right (Sizes & Clear) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {sizes.map((s) => (
              <button
                key={s.value}
                title={s.label}
                onClick={() => setLineWidth(s.value)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${lineWidth === s.value ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
              >
                <div className={`bg-slate-700 rounded-full ${s.sizeClass}`} />
              </button>
            ))}
          </div>
          
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-500 border border-red-500 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* CANVAS AREA container */}
      <div 
        className="flex-grow w-full border border-slate-200 bg-white rounded-xl shadow-sm relative overflow-hidden cursor-crosshair"
        style={{ height: '480px', touchAction: 'none' }}
      >
        {/* Helper Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.8
        }} />

        {/* Main Canvas holds final strokes & shapes */}
        <canvas
          ref={mainCanvasRef}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* Interactive Overlay for drawing paths + previewing shapes */}
        <canvas
          ref={overlayCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-10 w-full h-full block cursor-crosshair"
        />
      </div>
    </div>
  );
});

export default Canvas;
