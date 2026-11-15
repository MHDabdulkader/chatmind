import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Star,
  Play,
  ArrowRight,
  Sliders,
  Trash2,
  Tag,
  BookOpen,
  Code2,
  Lightbulb,
  FileText
} from 'lucide-react';
import { getPrompts, togglePinPrompt, deletePrompt } from '../api';

export default function ExploreView({ onLaunchPrompt, onOpenNewPromptModal }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    'Writing & Research',
    'Coding',
    'Editorial',
    'Data',
    'Synthesis',
    'Engineering',
    'Learning',
    'Ideation'
  ];

  const fetchPromptsList = async () => {
    setLoading(true);
    try {
      const data = await getPrompts(searchQuery, selectedCategory);
      setPrompts(data);
    } catch (err) {
      console.error('Failed to fetch prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromptsList();
  }, [searchQuery, selectedCategory]);

  const handleTogglePin = async (e, id) => {
    e.stopPropagation();
    try {
      await togglePinPrompt(id);
      fetchPromptsList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this prompt?")) return;
    try {
      await deletePrompt(id);
      fetchPromptsList();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter pinned vs all
  const pinnedPrompts = prompts.filter((p) => p.pinned);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] overflow-y-auto px-4 md:px-10 py-8 transition-colors pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Header (Image 3) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3ECE2] dark:bg-[#2B231D] text-[#8C5D39] dark:text-[#E07A5F] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Creative & Productive Hub</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2]">
              Prompt Library
            </h1>
            <p className="text-sm text-[#7A6E65] dark:text-[#A89D93] max-w-2xl">
              Explore, customize, and launch pre-tuned prompts and intelligent assistants with ease.
            </p>
          </div>

          <button
            onClick={onOpenNewPromptModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Prompt</span>
          </button>
        </div>

        {/* Pinned Favorites Section (Image 3) */}
        {pinnedPrompts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Pinned Favorites</span>
              </div>
              <span className="text-xs text-[#8A7D73]">
                {pinnedPrompts.length} curated assistants
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pinnedPrompts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/60 dark:hover:border-[#E07A5F]/60 shadow-xs flex flex-col justify-between gap-4 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#8A7D73]">
                      <span className="px-2 py-0.5 rounded-md bg-[#F2ECE1] dark:bg-[#2B231D] font-medium text-[#8C5D39] dark:text-[#D4A373]">
                        {p.category}
                      </span>
                      <span>~{p.est_tokens} tkn</span>
                    </div>

                    <h3 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2] group-hover:text-[#E07A5F] transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-[#7A6E65] dark:text-[#A89D93] line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F5EFE6] dark:border-[#2A231D]">
                    <button
                      onClick={(e) => handleTogglePin(e, p.id)}
                      className="text-amber-500 hover:text-stone-400 p-1 cursor-pointer"
                      title="Unpin"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </button>
                    <button
                      onClick={() => onLaunchPrompt(p.template.replace('{input}', ''))}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#E07A5F] hover:text-[#D56B50] cursor-pointer"
                    >
                      <span>Launch</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Category Filter Pills (Image 3) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9A8D83] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts and assistants..."
              className="w-full bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] rounded-xl pl-9 pr-4 py-2 text-xs text-[#2D2621] dark:text-[#FAF7F2] placeholder-[#9A8D83] focus:outline-none focus:border-[#E07A5F]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621]'
                    : 'bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] text-[#7A6E65] dark:text-[#A89D93] hover:border-[#E07A5F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Prompts Grid (Image 3) */}
        {loading ? (
          <div className="py-16 text-center text-sm text-[#8A7D73]">Loading prompt catalog...</div>
        ) : prompts.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#8A7D73]">No prompts found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((p) => {
              const tags = Array.isArray(p.tags) ? p.tags : [];
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/50 dark:hover:border-[#E07A5F]/50 shadow-xs flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#F4EDE2] dark:bg-[#2D241E] text-[#8C5D39] dark:text-[#E07A5F] flex items-center justify-center font-bold text-xs">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2]">
                            {p.name}
                          </h3>
                          <span className="text-[10px] text-[#8A7D73]">
                            {p.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleTogglePin(e, p.id)}
                        className="text-[#9A8D83] hover:text-amber-500 p-1 cursor-pointer"
                        title={p.pinned ? "Pinned" : "Pin prompt"}
                      >
                        <Star className={`w-4 h-4 ${p.pinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>
                    </div>

                    <p className="text-xs text-[#7A6E65] dark:text-[#A89D93] leading-relaxed line-clamp-3">
                      {p.description}
                    </p>

                    {/* Tag badges */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-md bg-[#FAF5EE] dark:bg-[#2A231D] text-[10px] text-[#8C7D73] dark:text-[#B0A398] font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F5EFE6] dark:border-[#2A231D] text-xs">
                    <span className="text-[#8A7D73] text-[11px] font-mono">
                      ~{p.est_tokens} tkn
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        className="p-1.5 text-[#9A8D83] hover:text-red-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors cursor-pointer"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onLaunchPrompt(p.template.replace('{input}', ''))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621] hover:bg-[#E07A5F] dark:hover:bg-[#E07A5F] hover:text-white dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Directive Tuner banner (Image 3 bottom banner) */}
        <div className="p-4 md:p-5 rounded-2xl bg-[#F7F1E7]/90 dark:bg-[#221B16]/90 border border-[#EAE0CF] dark:border-[#382E25] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/15 text-[#E07A5F] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Custom Directive Tuner
              </h4>
              <p className="text-xs text-[#7A6E65] dark:text-[#A89D93]">
                Test custom few-shot traces and parameters inside the interactive playground.
              </p>
            </div>
          </div>

          <button
            onClick={() => onLaunchPrompt("You are an expert system auditor. Analyze this system trace:\n\n")}
            className="px-4 py-2 rounded-xl bg-[#2D2621] dark:bg-[#FAF7F2] text-[#FAF7F2] dark:text-[#2D2621] text-xs font-medium hover:bg-[#E07A5F] dark:hover:bg-[#E07A5F] hover:text-white dark:hover:text-white transition-colors cursor-pointer"
          >
            Open Lab
          </button>
        </div>
      </div>
    </div>
  );
}
