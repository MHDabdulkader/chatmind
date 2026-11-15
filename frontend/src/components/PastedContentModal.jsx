import React, { useState } from 'react';
import { X, Copy, Check, FileText, Code2 } from 'lucide-react';

export default function PastedContentModal({ isOpen, onClose, content, title = "Pasted Content" }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !content) return null;

  const lines = content.split('\n');
  const sizeKb = (new Blob([content]).size / 1024).toFixed(1);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#1C1814] rounded-2xl md:rounded-3xl border border-[#EFE8DE] dark:border-[#2C241E] shadow-2xl flex flex-col overflow-hidden">
        {/* Header (Claude-style) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EFE8DE] dark:border-[#2C241E] bg-[#FCFAF7] dark:bg-[#201A16]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2] truncate">
                {title}
              </h3>
              <span className="text-[11px] text-[#8A7D73]">
                {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {sizeKb} KB · {content.length} characters
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2ECE1] dark:bg-[#2B231D] hover:bg-[#EAE1D3] dark:hover:bg-[#342B24] text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Content</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer with Line Numbers */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#FAF7F2]/60 dark:bg-[#141210]/60 font-mono text-xs leading-relaxed">
          <div className="flex">
            {/* Line numbers column */}
            <div className="select-none pr-4 text-right text-[#A09388] dark:text-[#5E5248] border-r border-[#EAE0D3] dark:border-[#2C241E]">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code / Text lines */}
            <div className="pl-4 flex-1 text-[#2D2621] dark:text-[#E8E1D8] overflow-x-auto whitespace-pre">
              {lines.map((line, i) => (
                <div key={i} className="leading-6">
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
