import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, FileText, Image, Code2, Loader2, ExternalLink } from 'lucide-react';
import { API_BASE } from '../api';

export default function FileViewerModal({ isOpen, onClose, file }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setContent('');
      setError(null);
      return;
    }

    const isImage = file.kind === 'image' || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    if (!isImage) {
      setLoading(true);
      setError(null);
      fetch(`${API_BASE}/documents/${file.id}/content`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Could not load file content');
          const text = await res.text();
          setContent(text);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isImage = file.kind === 'image' || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
  const isPdf = file.kind === 'pdf' || /\.pdf$/i.test(file.name);
  const isCode = file.kind === 'code' || /\.(py|js|jsx|ts|tsx|json|html|css|sql|rs|go|cpp|c|java|sh|ya?ml)$/i.test(file.name);

  const downloadUrl = `${API_BASE}/documents/${file.id}/content`;
  const sizeKb = file.size_bytes ? (file.size_bytes / 1024).toFixed(1) : '0';

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#1C1814] rounded-2xl md:rounded-3xl border border-[#EFE8DE] dark:border-[#2C241E] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EFE8DE] dark:border-[#2C241E] bg-[#FCFAF7] dark:bg-[#201A16]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0">
              {isImage ? <Image className="w-4 h-4" /> : isCode ? <Code2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2] truncate">
                {file.name}
              </h3>
              <span className="text-[11px] text-[#8A7D73]">
                {file.kind.toUpperCase()} · {sizeKb} KB {file.chunks ? `· ${file.chunks} chunks` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {content && !isImage && (
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
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            <a
              href={downloadUrl}
              download={file.name}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Viewer */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#FAF7F2]/60 dark:bg-[#141210]/60 flex items-center justify-center min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-xs text-[#8A7D73]">
              <Loader2 className="w-6 h-6 animate-spin text-[#E07A5F]" />
              <span>Loading file contents...</span>
            </div>
          ) : error ? (
            <div className="text-center text-xs text-red-500 p-4">
              <p>Failed to preview content: {error}</p>
              <p className="mt-2 text-stone-400">You can still download the file using the button above.</p>
            </div>
          ) : isImage ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-4">
              <img
                src={downloadUrl}
                alt={file.name}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-md border border-[#EAE0D3] dark:border-[#2C241E]"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] flex flex-col">
              <iframe
                src={downloadUrl}
                title={file.name}
                className="w-full h-full rounded-xl border border-[#EAE0D3] dark:border-[#2C241E]"
              />
            </div>
          ) : (
            /* Code / Text viewer with line numbers */
            <div className="w-full h-full font-mono text-xs leading-relaxed flex items-start">
              <div className="select-none pr-4 text-right text-[#A09388] dark:text-[#5E5248] border-r border-[#EAE0D3] dark:border-[#2C241E]">
                {lines.map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="pl-4 flex-1 text-[#2D2621] dark:text-[#E8E1D8] overflow-x-auto whitespace-pre">
                {lines.map((line, i) => (
                  <div key={i} className="leading-6">
                    {line || ' '}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
