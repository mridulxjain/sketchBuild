import React from 'react';

const InputModeSwitcher = ({ mode, onModeChange }) => {
  return (
    <div className="flex bg-black/20 p-1.5 rounded-2xl mb-2 border border-white/[0.04]">
      <button
        onClick={() => onModeChange('draw')}
        className={`flex-1 flex items-center justify-center py-2.5 text-[13px] font-semibold rounded-[10px] transition-all duration-300 ${
          mode === 'draw'
            ? 'bg-[#2A2B3D]/80 text-white shadow-md shadow-black/20 ring-1 ring-white/10'
            : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5'
        }`}
      >
        <svg className="w-4 h-4 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Draw Space
      </button>
      <button
        onClick={() => onModeChange('upload')}
        className={`flex-1 flex items-center justify-center py-2.5 text-[13px] font-semibold rounded-[10px] transition-all duration-300 ${
          mode === 'upload'
            ? 'bg-[#2A2B3D]/80 text-white shadow-md shadow-black/20 ring-1 ring-white/10'
            : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5'
        }`}
      >
        <svg className="w-4 h-4 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Image Upload
      </button>
    </div>
  );
};

export default InputModeSwitcher;
