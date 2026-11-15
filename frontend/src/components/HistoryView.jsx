import React, { useState, useEffect } from 'react';
import {
  Clock,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowRight,
  Search,
  Sparkles
} from 'lucide-react';
import { getThreads, getThreadMessages, renameThread, deleteThread } from '../api';

export default function HistoryView({ activeProject, onSelectThread, onStartNewChat }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const data = await getThreads(activeProject?.id || null);
      setThreads(data);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [activeProject]);

  const handleStartRename = (e, t) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditTitle(t.title);
  };

  const handleSaveRename = async (e, id) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameThread(id, editTitle.trim());
      setEditingId(null);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteThread(id);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenThread = async (t) => {
    try {
      const msgs = await getThreadMessages(t.id);
      onSelectThread({ ...t, messages: msgs });
    } catch (err) {
      console.error(err);
      onSelectThread({ ...t, messages: [] });
    }
  };

  const filteredThreads = threads.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] overflow-y-auto px-4 md:px-10 py-8 transition-colors pb-24 lg:pb-12">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2] flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-[#E07A5F]" />
              <span>Conversation History</span>
            </h1>
            <p className="text-xs md:text-sm text-[#7A6E65] dark:text-[#A89D93]">
              Review past discussions, resumes sessions, or manage conversation memory.
            </p>
          </div>

          <button
            onClick={onStartNewChat}
            className="px-4 py-2 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            + New Conversation
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#9A8D83] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] rounded-xl pl-9 pr-4 py-2 text-xs text-[#2D2621] dark:text-[#FAF7F2] placeholder-[#9A8D83] focus:outline-none focus:border-[#E07A5F]"
          />
        </div>

        {/* Threads list */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#8A7D73]">Loading history...</div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-[#9A8D83] mx-auto opacity-50" />
            <h3 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              No past conversations found
            </h3>
            <p className="text-xs text-[#7A6E65] dark:text-[#A89D93]">
              Start chatting from the Home tab to build your conversation history.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredThreads.map((t) => (
              <div
                key={t.id}
                onClick={() => handleOpenThread(t)}
                className="p-4 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/50 shadow-xs flex items-center justify-between gap-4 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-[#FAF7F2] dark:bg-[#141210] border border-[#E07A5F] rounded-lg px-2.5 py-1 text-xs text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none flex-1"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveRename(e, t.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-sm text-[#2D2621] dark:text-[#FAF7F2] truncate group-hover:text-[#E07A5F] transition-colors">
                          {t.title}
                        </h3>
                        <p className="text-[11px] text-[#8A7D73] mt-0.5">
                          {new Date(t.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleStartRename(e, t)}
                    className="p-1.5 text-[#9A8D83] hover:text-[#2D2621] dark:hover:text-[#FAF7F2] rounded-lg hover:bg-[#F2ECE1] dark:hover:bg-[#2B231D] transition-colors cursor-pointer"
                    title="Rename thread"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, t.id)}
                    className="p-1.5 text-[#9A8D83] hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-[#EFE8DE] dark:bg-[#2C241E] mx-1" />

                  <div className="text-[#9A8D83] group-hover:text-[#E07A5F] transition-colors p-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
