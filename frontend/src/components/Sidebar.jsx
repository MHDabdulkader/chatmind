import React from 'react';
import {
  Sparkles,
  Plus,
  Home,
  Clock,
  LayoutGrid,
  FileText,
  Settings,
  ArrowRight,
  ChevronDown,
  User,
  Crown,
  FolderArchive
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
  currentView,
  setCurrentView,
  onNewChat,
  isDark,
  onToggleTheme,
  userName = "Kader",
  activeProjectName = "Default"
}) {
  const navItems = [
    { id: 'chat', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'explore', label: 'Explore', icon: LayoutGrid },
    { id: 'files', label: 'All Files', icon: FolderArchive },
    { id: 'research', label: 'Research Hub', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col justify-between border-r border-[#EFE8DE] dark:border-[#2C241E] bg-[#FCFAF7] dark:bg-[#1A1613] p-4 select-none shrink-0 transition-colors">
      {/* Top Header & Brand */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentView('chat')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E07A5F] to-[#F4A261] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 fill-white/80" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#2D2621] dark:text-[#F5EFEB]">
              ChatMind
            </span>
          </div>

          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] active:scale-[0.98] text-white font-medium text-sm shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Main Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#F2ECE1] dark:bg-[#2B231D] text-[#2D2621] dark:text-[#FAF7F2]'
                    : 'text-[#7A6E65] dark:text-[#A89D93] hover:bg-[#F8F3EB] dark:hover:bg-[#241D18] hover:text-[#2D2621] dark:hover:text-[#FAF7F2]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#E07A5F]' : 'text-[#9A8D83] dark:text-[#7A6F66]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Pro Upgrade Card & User Profile */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[#EFE8DE] dark:border-[#2C241E]">
        {/* Upgrade Card */}
        <div className="p-3.5 rounded-2xl bg-[#F7F1E7]/80 dark:bg-[#251E18]/80 border border-[#E9DFCF] dark:border-[#382C22] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C5D39] dark:text-[#D4A373]">
            <Crown className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span>Upgrade to Pro</span>
          </div>
          <p className="text-[12px] leading-relaxed text-[#7A6D63] dark:text-[#A6998E]">
            Get more powerful features, Claude & GPT-4o models, and higher limits.
          </p>
          <button
            onClick={() => setCurrentView('settings')}
            className="mt-1 flex items-center justify-between text-xs font-medium px-3 py-1.5 rounded-lg bg-[#E07A5F] hover:bg-[#D56B50] text-white transition-colors cursor-pointer"
          >
            <span>Go Pro</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F2ECE1] dark:hover:bg-[#261F19] transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full bg-[#E5DCD0] dark:bg-[#382F27] flex items-center justify-center text-[#5C4F44] dark:text-[#D5C9BD] font-semibold text-xs border border-white/60 dark:border-black/30">
              {userName.slice(0, 2).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#1A1613] rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#2D2621] dark:text-[#F5EFEB]">
                {userName}
              </span>
              <span className="text-[10px] text-[#8A7D73] dark:text-[#8F8379]">
                Active · Free Tier
              </span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8A7D73]" />
        </div>
      </div>
    </aside>
  );
}
