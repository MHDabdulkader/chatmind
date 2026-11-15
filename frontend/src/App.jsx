import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import ChatView from './components/ChatView';
import ExploreView from './components/ExploreView';
import ResearchHubView from './components/ResearchHubView';
import HistoryView from './components/HistoryView';
import FilesView from './components/FilesView';
import SettingsView from './components/SettingsView';
import NewPromptModal from './components/NewPromptModal';
import NewProjectModal from './components/NewProjectModal';
import { getProjects, getModels } from './api';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('chatmind_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // User state
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('chatmind_user') || 'Kader';
  });

  // View state
  const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'history' | 'explore' | 'research' | 'settings'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  // Models state
  const [availableModels, setAvailableModels] = useState([
    { id: 'gemini-3.5-flash', name: 'Google: Gemini 3.5 Flash (Direct)', free: true, provider: 'Google' }
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');

  // Thread state
  const [currentThread, setCurrentThread] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState(null);

  // Modals
  const [isNewPromptOpen, setIsNewPromptOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  // Handle Dark mode class toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('chatmind_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('chatmind_theme', 'light');
    }
  }, [isDark]);

  // Persist user name
  useEffect(() => {
    localStorage.setItem('chatmind_user', userName);
  }, [userName]);

  // Fetch initial projects & models
  const loadInitialData = async () => {
    try {
      const [projList, modelsList] = await Promise.all([
        getProjects(),
        getModels()
      ]);
      setProjects(projList);
      if (projList.length > 0) {
        setActiveProject(projList[0]);
      }
      if (modelsList.length > 0) {
        setAvailableModels(modelsList);
        const def = modelsList.find(m => m.default) || modelsList[0];
        setSelectedModel(def.id);
      }
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleToggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleNewChat = () => {
    setCurrentThread(null);
    setCurrentView('chat');
    setMobileMenuOpen(false);
  };

  const handleLaunchPrompt = (promptText) => {
    setInitialPrompt(promptText);
    setCurrentView('chat');
    setMobileMenuOpen(false);
  };

  const handleSelectThread = (thread) => {
    setCurrentThread(thread);
    setCurrentView('chat');
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2] dark:bg-[#141210] text-[#2D2621] dark:text-[#F5EFEB] font-sans antialiased selection:bg-[#E07A5F]/20 selection:text-[#E07A5F]">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          onNewChat={handleNewChat}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          userName={userName}
          activeProjectName={activeProject?.name || 'Default'}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentView={currentView}
          setCurrentView={(v) => {
            setCurrentView(v);
            setMobileMenuOpen(false);
          }}
          onNewChat={handleNewChat}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          userName={userName}
          activeProjectName={activeProject?.name || 'Default'}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <Navbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNewChat={handleNewChat}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        {/* Dynamic Views */}
        {currentView === 'chat' && (
          <ChatView
            currentThread={currentThread}
            setCurrentThread={setCurrentThread}
            activeProject={activeProject}
            projects={projects}
            setActiveProject={setActiveProject}
            availableModels={availableModels}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt(null)}
            onOpenFilesVault={() => setCurrentView('files')}
          />
        )}

        {currentView === 'files' && (
          <FilesView
            activeProject={activeProject}
            projects={projects}
            setActiveProject={setActiveProject}
          />
        )}

        {currentView === 'explore' && (
          <ExploreView
            onLaunchPrompt={handleLaunchPrompt}
            onOpenNewPromptModal={() => setIsNewPromptOpen(true)}
          />
        )}

        {currentView === 'research' && (
          <ResearchHubView
            activeProject={activeProject}
            projects={projects}
            setActiveProject={setActiveProject}
            onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            activeProject={activeProject}
            onSelectThread={handleSelectThread}
            onStartNewChat={handleNewChat}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            userName={userName}
            setUserName={setUserName}
            availableModels={availableModels}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}

        {/* Mobile Bottom Navigation */}
        <MobileNav
          currentView={currentView}
          setCurrentView={(v) => {
            setCurrentView(v);
            setMobileMenuOpen(false);
          }}
        />
      </main>

      {/* Modals */}
      <NewPromptModal
        isOpen={isNewPromptOpen}
        onClose={() => setIsNewPromptOpen(false)}
        onPromptCreated={() => {}}
      />

      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onProjectCreated={(newProj) => {
          setProjects(prev => [newProj, ...prev]);
          setActiveProject(newProj);
        }}
      />
    </div>
  );
}
