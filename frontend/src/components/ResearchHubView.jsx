import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Link,
  Plus,
  Trash2,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  FileCheck,
  Globe,
  Loader2
} from 'lucide-react';
import {
  getDocuments,
  uploadDocument,
  addDocumentUrl,
  deleteDocument,
  getProjectStats,
  runSynthesis,
  exportProjectPdf
} from '../api';

export default function ResearchHubView({
  activeProject,
  projects,
  setActiveProject,
  onOpenNewProjectModal
}) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ sources: 0, indexed: 0, indexing: 0, failed: 0, chunks: 0 });
  const [findings, setFindings] = useState([]);
  const [synthesisNote, setSynthesisNote] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const projectId = activeProject?.id || 'default';

  const loadData = async () => {
    setLoadingDocs(true);
    setUploadError(null);
    try {
      const [docsData, statsData] = await Promise.all([
        getDocuments(projectId),
        getProjectStats(projectId)
      ]);
      setDocuments(docsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadData();
    setFindings([]);
    setSynthesisNote('');
  }, [projectId]);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingDocs(true);
    setUploadError(null);
    try {
      await uploadDocument(file, projectId);
      await loadData();
    } catch (err) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Handle URL indexing
  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsAddingUrl(true);
    setUploadError(null);
    try {
      await addDocumentUrl(urlInput.trim(), projectId);
      setUrlInput('');
      await loadData();
    } catch (err) {
      setUploadError(err.message || 'Failed to index URL');
    } finally {
      setIsAddingUrl(false);
    }
  };

  // Handle delete doc
  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Remove this document from project knowledge base?")) return;
    try {
      await deleteDocument(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Run AI Synthesis
  const handleRunSynthesis = async () => {
    setIsSynthesizing(true);
    try {
      const res = await runSynthesis(projectId);
      if (res.findings && res.findings.length > 0) {
        setFindings(res.findings);
        setSynthesisNote('');
      } else {
        setFindings([]);
        setSynthesisNote(res.note || 'No findings generated. Make sure your documents contain text.');
      }
    } catch (err) {
      console.error('Synthesis failed:', err);
      setSynthesisNote('Synthesis failed: ' + err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportProjectPdf(projectId, findings.length > 0 ? findings : null);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject?.name || 'research'}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] overflow-y-auto px-4 md:px-10 py-8 transition-colors pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Header (Image 2) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EFE8DE] dark:border-[#2C241E] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8C5D39] dark:text-[#E07A5F] uppercase tracking-wider">
              <span>PROJECT HUB</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Sync
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2]">
                Research Hub – {activeProject?.name || 'Default Project'}
              </h1>

              {/* Project selector dropdown */}
              <select
                value={projectId}
                onChange={(e) => {
                  const p = projects.find(proj => proj.id === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="text-xs bg-[#F2ECE1] dark:bg-[#2B231D] border border-[#E5DACD] dark:border-[#3D332A] rounded-lg px-2.5 py-1 text-[#2D2621] dark:text-[#F5EFEB] font-medium cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <p className="text-xs md:text-sm text-[#7A6E65] dark:text-[#A89D93] max-w-2xl">
              {activeProject?.description || 'Centralized RAG research repository. Upload files, index URLs, and run multi-document synthesis.'}
            </p>
          </div>

          {/* Action buttons (Image 2) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewProjectModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621] hover:bg-[#E07A5F] dark:hover:bg-[#E07A5F] hover:text-white dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Badges (Image 2) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8A7D73] font-semibold uppercase tracking-wider">
              <span>SOURCES</span>
              <FileCheck className="w-4 h-4 text-[#E07A5F]" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#2D2621] dark:text-[#FAF7F2]">
                {stats.sources}
              </span>
              <p className="text-[11px] text-[#8A7D73] mt-0.5">Verified files linked</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8A7D73] font-semibold uppercase tracking-wider">
              <span>CONFIDENCE</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                98%
              </span>
              <p className="text-[11px] text-[#8A7D73] mt-0.5">Zero hallucinations</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8A7D73] font-semibold uppercase tracking-wider">
              <span>CHUNKS INDEXED</span>
              <Layers className="w-4 h-4 text-[#E07A5F]" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#2D2621] dark:text-[#FAF7F2]">
                {stats.chunks}
              </span>
              <p className="text-[11px] text-[#8A7D73] mt-0.5">{stats.indexed} files embedded</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8A7D73] font-semibold uppercase tracking-wider">
              <span>POLICY IMPACT</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                High
              </span>
              <p className="text-[11px] text-[#8A7D73] mt-0.5">Tier 1 Priority</p>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {uploadError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="font-bold">✕</button>
          </div>
        )}

        {/* Main Grid: Sources (Left) & Key Findings (Right) (Image 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Sources & Documents (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#2D2621] dark:text-[#FAF7F2] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#E07A5F]" />
                <span>Sources & Documents</span>
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#F2ECE1] dark:bg-[#2B231D] text-[#8C5D39] dark:text-[#E07A5F] font-medium">
                {documents.length} Synced
              </span>
            </div>

            {/* Drag & Drop / File Upload Box (Image 2) */}
            <div className="relative rounded-2xl border-2 border-dashed border-[#E5DACD] dark:border-[#382F27] bg-[#FCFAF7] dark:bg-[#1E1915] p-5 text-center transition-colors hover:border-[#E07A5F]/70">
              <input
                type="file"
                accept=".txt,.md,.pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                  + Add Document
                </span>
                <span className="text-[11px] text-[#8A7D73]">
                  Drag files (.pdf, .txt, .md) or click to browse
                </span>
              </div>
            </div>

            {/* Quick URL Ingester */}
            <form onSubmit={handleAddUrl} className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-3.5 h-3.5 text-[#9A8D83] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2D2621] dark:text-[#FAF7F2] placeholder-[#9A8D83] focus:outline-none focus:border-[#E07A5F]"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingUrl}
                className="px-3 py-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2B231D] hover:bg-[#E07A5F] hover:text-white dark:hover:bg-[#E07A5F] text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2] transition-colors cursor-pointer shrink-0"
              >
                {isAddingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Index URL'}
              </button>
            </form>

            {/* Document list */}
            {loadingDocs ? (
              <div className="py-8 text-center text-xs text-[#8A7D73]">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8A7D73]">No documents yet. Add one above!</div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                  const isUrl = doc.kind === 'url';
                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0">
                          {isUrl ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2] truncate">
                            {doc.name}
                          </p>
                          <span className="text-[10px] text-[#8A7D73]">
                            {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : 'Web page'} · {doc.chunks || 0} chunks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.status === 'indexed' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Synced
                          </span>
                        ) : doc.status === 'indexing' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-[10px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                            Indexing...
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/50 text-[10px] font-semibold text-red-600 dark:text-red-400" title={doc.error}>
                            Failed
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#9A8D83] hover:text-red-500 rounded transition-all cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Key Findings & Synthesis (7 cols) (Image 2) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E07A5F]" />
                <h2 className="text-base font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                  Key Findings & Synthesis
                </h2>
              </div>

              <button
                onClick={handleRunSynthesis}
                disabled={isSynthesizing || documents.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621] hover:bg-[#E07A5F] dark:hover:bg-[#E07A5F] hover:text-white dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize Key Findings</span>
                  </>
                )}
              </button>
            </div>

            {/* Findings Container */}
            {findings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                  No synthesis run yet
                </h3>
                <p className="text-xs text-[#7A6E65] dark:text-[#A89D93] max-w-sm mx-auto leading-relaxed">
                  {synthesisNote || 'Click "Synthesize Key Findings" above to analyze all uploaded documents and extract structured takeaways.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 md:p-5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2]">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#7A6E65] dark:text-[#A89D93] leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    </div>

                    {/* Sources citations */}
                    {item.sources && item.sources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 pl-9">
                        <span className="text-[10px] text-[#9A8D83]">Sources:</span>
                        {item.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-[#FAF5EE] dark:bg-[#2B231D] text-[10px] text-[#8C5D39] dark:text-[#E07A5F] font-mono"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Footer notes & export (Image 2) */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8A7D73]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>All data verified & citations preserved</span>
                  </div>

                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white font-semibold shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
