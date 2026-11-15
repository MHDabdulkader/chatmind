import React from 'react';
import { Home, Clock, LayoutGrid, FileText, Settings, FolderArchive } from 'lucide-react';

export default function MobileNav({ currentView, setCurrentView }) {
  const tabs = [
    { id: 'chat', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'files', label: 'Files', icon: FolderArchive },
    { id: 'explore', label: 'Explore', icon: LayoutGrid },
    { id: 'research', label: 'Research', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-[#EFE8DE] dark:border-[#2C241E] bg-[#FCFAF7]/95 dark:bg-[#1A1613]/95 backdrop-blur-md px-1 flex items-center justify-around shadow-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 xs:px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#E07A5F] font-semibold'
                : 'text-[#8C7E74] dark:text-[#9E9085] hover:text-[#2D2621] dark:hover:text-[#FAF7F2]'
            }`}
          >
            <Icon className={`w-4 h-4 xs:w-5 xs:h-5 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
