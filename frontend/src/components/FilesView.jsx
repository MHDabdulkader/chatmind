import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Code2,
  Image,
  FileText,
  Upload,
  Search,
  Trash2,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument, API_BASE } from '../api';
import FileViewerModal from './FileViewerModal';

export default function FilesView({ activeProject, projects, setActiveProject }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'code' | 'image' | 'pdf'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileForModal, setSelectedFileForModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const projectId = activeProject?.id || 'default';

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await getDocuments(projectId);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  // Handle multi-format file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      await uploadDocument(file, projectId);
      await loadDocuments();
    } catch (err) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this file from your project?")) return;
    try {
      await deleteDocument(id);
      loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Categorize files
  const isImageFile = (doc) => doc.kind === 'image' || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.name);
  const isCodeFile = (doc) => doc.kind === 'code' || /\.(py|js|jsx|ts|tsx|json|html|css|sql|rs|go|cpp|c|java|sh|ya?ml)$/i.test(doc.name);
  const isPdfFile = (doc) => doc.kind === 'pdf' || doc.kind === 'document' || /\.(pdf|txt|md|csv)$/i.test(doc.name);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'code') return isCodeFile(doc);
    if (activeTab === 'image') return isImageFile(doc);
    if (activeTab === 'pdf') return isPdfFile(doc);
    return true;
  });

  const codeFiles = documents.filter(isCodeFile);
  const imageFiles = documents.filter(isImageFile);
  const pdfFiles = documents.filter(isPdfFile);

  const getLanguageLabel = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      py: 'Python', js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript',
      tsx: 'React TSX', json: 'JSON', html: 'HTML', css: 'CSS',
      sql: 'SQL', rs: 'Rust', go: 'Go', cpp: 'C++', c: 'C', java: 'Java'
    };
    return map[ext] || ext.toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] overflow-y-auto px-4 md:px-10 py-8 transition-colors pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EFE8DE] dark:border-[#2C241E] pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3ECE2] dark:bg-[#2B231D] text-[#8C5D39] dark:text-[#E07A5F] text-xs font-semibold">
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Project Knowledge Vault</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2]">
              Files & Assets Manager
            </h1>
            <p className="text-xs md:text-sm text-[#7A6E65] dark:text-[#A89D93] max-w-2xl">
              Inspect all uploaded files separated into large code, images, and PDF documents.
            </p>
          </div>

          {/* Upload Button & Project selector */}
          <div className="flex items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => {
                const p = projects.find(proj => proj.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              className="text-xs bg-[#F2ECE1] dark:bg-[#2B231D] border border-[#E5DACD] dark:border-[#3D332A] rounded-xl px-3 py-2 text-[#2D2621] dark:text-[#F5EFEB] font-medium cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>📁 {p.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Files</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs">
            {uploadError}
          </div>
        )}

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621]'
                  : 'bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] text-[#7A6E65] dark:text-[#A89D93]'
              }`}
            >
              All Files ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621]'
                  : 'bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] text-[#7A6E65] dark:text-[#A89D93]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Large Code ({codeFiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621]'
                  : 'bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] text-[#7A6E65] dark:text-[#A89D93]'
              }`}
            >
              <Image className="w-3.5 h-3.5 text-emerald-500" />
              <span>Images & Visuals ({imageFiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621]'
                  : 'bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] text-[#7A6E65] dark:text-[#A89D93]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PDFs & Docs ({pdfFiles.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#9A8D83] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#2D2621] dark:text-[#FAF7F2] placeholder-[#9A8D83] focus:outline-none focus:border-[#E07A5F]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-[#8A7D73]">Loading project files...</div>
        ) : documents.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] text-center space-y-3">
            <FolderArchive className="w-10 h-10 text-[#9A8D83] mx-auto opacity-50" />
            <h3 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              No files uploaded yet
            </h3>
            <p className="text-xs text-[#7A6E65] dark:text-[#A89D93] max-w-sm mx-auto">
              Upload code files, screenshots/images, or PDFs using the "Upload Files" button above.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* SECTION 1: LARGE CODE & SCRIPTS */}
            {(activeTab === 'all' || activeTab === 'code') && codeFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFE8DE] dark:border-[#2C241E] pb-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-500" />
                    <h2 className="text-sm font-bold text-[#2D2621] dark:text-[#FAF7F2]">
                      Code & Script Files ({codeFiles.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-[#8A7D73]">Syntax highlighted & indexed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {codeFiles.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedFileForModal(doc)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/50 shadow-xs flex flex-col justify-between gap-3 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Code2 className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <h4 className="font-semibold text-xs text-[#2D2621] dark:text-[#FAF7F2] truncate group-hover:text-[#E07A5F]">
                              {doc.name}
                            </h4>
                            <span className="text-[10px] text-[#8A7D73]">
                              {getLanguageLabel(doc.name)} · {Math.round(doc.size_bytes / 1024)} KB
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-[#FAF5EE] dark:bg-[#2B231D] text-[10px] font-mono font-medium text-[#8C5D39] dark:text-[#E07A5F]">
                          {doc.chunks || 1} chunks
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F5EFE6] dark:border-[#2A231D] text-xs">
                        <span className="text-[11px] text-[#8A7D73] flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>Click to inspect code</span>
                        </span>

                        <button
                          onClick={(e) => handleDelete(e, doc.id)}
                          className="p-1 text-[#9A8D83] hover:text-red-500 rounded cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: IMAGES & VISUALS */}
            {(activeTab === 'all' || activeTab === 'image') && imageFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFE8DE] dark:border-[#2C241E] pb-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-sm font-bold text-[#2D2621] dark:text-[#FAF7F2]">
                      Images & Visuals ({imageFiles.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-[#8A7D73]">Thumbnails & full-res previews</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imageFiles.map((doc) => {
                    const downloadUrl = `${API_BASE}/documents/${doc.id}/content`;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedFileForModal(doc)}
                        className="rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] overflow-hidden hover:border-[#E07A5F]/50 shadow-xs flex flex-col group cursor-pointer transition-all"
                      >
                        {/* Image Thumbnail */}
                        <div className="h-32 w-full bg-[#F5EFE6] dark:bg-[#2B231D] relative overflow-hidden flex items-center justify-center">
                          <img
                            src={downloadUrl}
                            alt={doc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Image Info */}
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <h4 className="font-semibold text-xs text-[#2D2621] dark:text-[#FAF7F2] truncate group-hover:text-[#E07A5F]">
                              {doc.name}
                            </h4>
                            <span className="text-[10px] text-[#8A7D73]">
                              {Math.round(doc.size_bytes / 1024)} KB
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleDelete(e, doc.id)}
                            className="p-1 text-[#9A8D83] hover:text-red-500 rounded cursor-pointer shrink-0"
                            title="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: PDFS & DOCUMENTS */}
            {(activeTab === 'all' || activeTab === 'pdf') && pdfFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFE8DE] dark:border-[#2C241E] pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-500" />
                    <h2 className="text-sm font-bold text-[#2D2621] dark:text-[#FAF7F2]">
                      PDFs & Research Documents ({pdfFiles.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-[#8A7D73]">Embedded in RAG Vector Store</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pdfFiles.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedFileForModal(doc)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/50 shadow-xs flex flex-col justify-between gap-3 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <h4 className="font-semibold text-xs text-[#2D2621] dark:text-[#FAF7F2] truncate group-hover:text-[#E07A5F]">
                              {doc.name}
                            </h4>
                            <span className="text-[10px] text-[#8A7D73]">
                              {doc.name.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Text/Markdown'} · {Math.round(doc.size_bytes / 1024)} KB
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                          Synced
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F5EFE6] dark:border-[#2A231D] text-xs">
                        <span className="text-[11px] text-[#8A7D73] font-mono">
                          {doc.chunks} chunks indexed
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDelete(e, doc.id)}
                            className="p-1 text-[#9A8D83] hover:text-red-500 rounded cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Inspector Modal */}
      <FileViewerModal
        isOpen={!!selectedFileForModal}
        onClose={() => setSelectedFileForModal(null)}
        file={selectedFileForModal}
      />
    </div>
  );
}
