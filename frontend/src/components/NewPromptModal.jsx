import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { createPrompt } from '../api';

export default function NewPromptModal({ isOpen, onClose, onPromptCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('You are an expert. Help me with this:\n\n{input}');
  const [category, setCategory] = useState('General');
  const [tagsInput, setTagsInput] = useState('#Custom, #Productivity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !template.trim()) {
      setError('Please provide a name and template.');
      return;
    }

    setSaving(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await createPrompt({
        name: name.trim(),
        description: description.trim(),
        template: template.trim(),
        category,
        tags
      });
      onPromptCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create prompt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#1E1915] rounded-3xl border border-[#EFE8DE] dark:border-[#2C241E] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#2D2621] dark:text-[#FAF7F2]">
              Create New Prompt
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              Prompt Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. System Architect Reviewer"
              className="w-full bg-[#FAF7F2] dark:bg-[#15110E] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3 py-2 text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this prompt accomplishes..."
              className="w-full bg-[#FAF7F2] dark:bg-[#15110E] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3 py-2 text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#15110E] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3 py-2 text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
              >
                <option value="General">General</option>
                <option value="Writing & Research">Writing & Research</option>
                <option value="Coding">Coding</option>
                <option value="Engineering">Engineering</option>
                <option value="Editorial">Editorial</option>
                <option value="Data">Data</option>
                <option value="Synthesis">Synthesis</option>
                <option value="Learning">Learning</option>
                <option value="Ideation">Ideation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="#Review, #Code"
                className="w-full bg-[#FAF7F2] dark:bg-[#15110E] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3 py-2 text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Template
              </label>
              <span className="text-[10px] text-[#8A7D73]">Use {"{input}"} placeholder</span>
            </div>
            <textarea
              rows={4}
              required
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-[#FAF7F2] dark:bg-[#15110E] border border-[#E5DACD] dark:border-[#382F27] rounded-xl p-3 text-[#2D2621] dark:text-[#FAF7F2] font-mono text-[11px] focus:outline-none focus:border-[#E07A5F]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Prompt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
