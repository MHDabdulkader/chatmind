import React from 'react';
import { Sparkles, Menu, X, Plus } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar({
  onOpenMobileMenu,
  onNewChat,
  isDark,
  onToggleTheme,
  currentViewTitle = "ChatMind"
}) {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#EFE8DE] dark:border-[#2C241E] bg-[#FCFAF7] dark:bg-[#1A1613] sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-lg border border-[#E8DECF] dark:border-[#382E25] text-[#7A6E65] dark:text-[#A89D93] hover:bg-[#F2ECE1] dark:hover:bg-[#251E18] cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#E07A5F] to-[#F4A261] flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5 fill-white/80" />
          </div>
          <span className="font-semibold text-base tracking-tight text-[#2D2621] dark:text-[#F5EFEB]">
            ChatMind
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg bg-[#E07A5F] hover:bg-[#D56B50] text-white cursor-pointer shadow-xs"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
