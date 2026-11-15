import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Code2 } from 'lucide-react';

export default function CodeBlock({ language = 'code', code = '', defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');
  const lineCount = lines.length;
  const isLarge = lineCount > 14;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#2E2824] bg-[#1E1C1A] text-stone-100 shadow-sm transition-all">
      {/* Code Header Bar */}
      <div
        onClick={() => isLarge && setCollapsed(!collapsed)}
        className={`flex items-center justify-between px-3.5 py-2 bg-[#282522] border-b border-[#36322E] select-none ${
          isLarge ? 'cursor-pointer hover:bg-[#302B27]' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {/* macOS traffic light dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>

          <span className="text-[11px] font-mono text-stone-300 font-semibold uppercase tracking-wider">
            {language}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>

          {isLarge && (
            <span className="text-[10px] text-[#E07A5F] hover:underline flex items-center gap-0.5 ml-1 font-sans">
              {collapsed ? (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Collapse</span>
                </>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-stone-100 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-white/5"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      {!collapsed ? (
        <div className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed max-h-[500px] overflow-y-auto">
          <pre>{code}</pre>
        </div>
      ) : (
        <div
          onClick={() => setCollapsed(false)}
          className="px-4 py-2.5 bg-[#171514] text-xs text-stone-400 hover:text-stone-200 cursor-pointer flex items-center justify-between font-mono"
        >
          <span className="truncate opacity-75">
            // ... {lineCount} lines collapsed ({lines[0]?.slice(0, 45)}...)
          </span>
          <span className="text-[11px] text-[#E07A5F] font-sans font-medium shrink-0 ml-2">
            Click to expand
          </span>
        </div>
      )}
    </div>
  );
}
