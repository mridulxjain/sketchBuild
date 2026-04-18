import React, { useState, useRef } from 'react';

const ImageUpload = ({ onImageUpload, uploadedImage, clearImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file) => {
    setError(null);
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      onImageUpload({ dataUrl, base64, file: { name: file.name, sizeStr } });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div 
        className={`flex-grow flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed overflow-hidden transition-all duration-300 relative cursor-pointer ${
          isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/[0.08] bg-[#0B0F14]/50 hover:border-white/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploadedImage && fileInputRef.current?.click()}
        style={{ minHeight: '480px' }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {uploadedImage ? (
          <div className="absolute inset-0 p-4 flex flex-col group">
            <div className="relative flex-1 bg-[#0B0F14] rounded-xl overflow-hidden flex items-center justify-center border border-white/[0.04] shadow-inner">
              <img src={uploadedImage.dataUrl} alt="Uploaded" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={(e) => { e.stopPropagation(); clearImage(); }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-red-500 text-white/80 hover:text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="shrink-0 mt-3 flex items-center justify-between text-xs text-[#9CA3AF] px-1 pointer-events-none">
              <span className="truncate font-medium text-[#E5E7EB]">{uploadedImage.file.name}</span>
              <span className="shrink-0 ml-2 opacity-60">{uploadedImage.file.sizeStr}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 h-full w-full pointer-events-none">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-colors ${
              isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-[#9CA3AF]'
            }`}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#E5E7EB] mb-1.5">
              Drop image here or click to browse
            </p>
            <p className="text-xs text-[#9CA3AF] mb-6 opacity-80">
              Only PNG, JPG, or WEBP. Max 5MB.
            </p>
            
            {error && (
              <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg animate-fadeIn pointer-events-auto">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
