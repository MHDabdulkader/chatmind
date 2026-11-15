import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Paperclip,
  Globe,
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Code2,
  BookOpen,
  Lightbulb,
  FileSearch,
  Layers,
  Clock,
  Cpu,
  Lock,
  Loader2,
  Trash2,
  FileText,
  X,
  Eye,
  ExternalLink,
  AlertTriangle,
  Zap
} from 'lucide-react';
import RobotMascot from './RobotMascot';
import PastedContentModal from './PastedContentModal';
import CodeBlock from './CodeBlock';
import { streamChat, uploadDocument } from '../api';

function parseUserContent(msg) {
  let text = msg.content || '';
  let attachments = msg.pastedAttachments ? [...msg.pastedAttachments] : [];

  if (text && typeof text === 'string' && text.includes('--- [Attached Content #')) {
    const parts = text.split(/\r?\n\r?\n--- \[Attached Content #\d+: (.*?)\] ---\r?\n/);
    if (parts.length > 1) {
      text = parts[0].trim();
      if (attachments.length === 0) {
        for (let i = 1; i < parts.length; i += 2) {
          const title = parts[i];
          const rawBody = (parts[i + 1] || '').trim();
          attachments.push({
            id: `restored-att-${i}`,
            title: title || 'Attached Snippet',
            content: rawBody,
            lines: rawBody ? rawBody.split('\n').length : 0,
            sizeKb: (rawBody.length / 1024).toFixed(1)
          });
        }
      }
    }
  }

  return { text, attachments };
}

export default function ChatView({
  currentThread,
  setCurrentThread,
  activeProject,
  projects,
  setActiveProject,
  availableModels,
  selectedModel,
  setSelectedModel,
  onRefreshThreads,
  initialPrompt = null,
  onClearInitialPrompt = () => {},
  onOpenFilesVault = () => {}
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [allowWeb, setAllowWeb] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [likedMap, setLikedMap] = useState({});
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Claude-style pasted content attachments
  const [pastedAttachments, setPastedAttachments] = useState([]);
  const [activePastedModal, setActivePastedModal] = useState(null);

  // Rate limit / Quota banner state
  const [rateLimitNotice, setRateLimitNotice] = useState(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState(null);
  const lastPromptSentRef = useRef('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // If passed an initial prompt from Explore page, populate it
  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
      onClearInitialPrompt();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Load thread messages if currentThread changed
  useEffect(() => {
    if (currentThread && currentThread.messages) {
      setMessages(currentThread.messages);
    } else if (!currentThread) {
      setMessages([]);
    }
  }, [currentThread]);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle textarea auto-resize
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Claude-style paste interceptor: large text or code becomes an attachment
  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text');
    if (!pasted) return;

    const lineCount = pasted.split('\n').length;
    // Intercept if multi-line (> 3 lines) or long text (> 200 characters)
    if (pasted.length > 200 || lineCount > 3) {
      e.preventDefault();
      const firstLine = pasted.trim().split('\n')[0].slice(0, 32);
      const title = firstLine.length > 4 ? `Snippet: ${firstLine}...` : 'Pasted text';
      const sizeKb = (new Blob([pasted]).size / 1024).toFixed(1);

      const newAttachment = {
        id: Date.now() + Math.random(),
        title,
        content: pasted,
        lines: lineCount,
        sizeKb
      };

      setPastedAttachments((prev) => [...prev, newAttachment]);
    }
  };

  // Quick suggestion chips
  const quickPrompts = [
    { icon: Lightbulb, label: "Summarize this article", prompt: "Summarize the key points of our project notes and documents in 4 clear takeaways." },
    { icon: Code2, label: "Write some code", prompt: "Explain React hooks in simple words, and show me a modern stateful counter snippet with useState." },
    { icon: BookOpen, label: "Study help", prompt: "Teach me how vector databases work under the hood with clear step-by-step intuition." },
    { icon: Sparkles, label: "Brainstorm ideas", prompt: "Brainstorm 5 innovative AI features for our document research workspace." }
  ];

  // Send message
  const handleSend = async (customText = null, modelOverride = null) => {
    const textToSend = (customText !== null ? customText : inputMessage).trim();
    if (!textToSend && pastedAttachments.length === 0) return;
    if (isGenerating) return;

    lastPromptSentRef.current = textToSend;
    const modelToUse = modelOverride || selectedModel;

    // Combine user prompt and pasted attachments for agent ingestion
    let agentPrompt = textToSend;
    if (pastedAttachments.length > 0) {
      const attachmentsBlock = pastedAttachments
        .map((a, i) => `\n\n--- [Attached Content #${i + 1}: ${a.title}] ---\n${a.content}`)
        .join('\n');
      agentPrompt = textToSend
        ? `${textToSend}\n${attachmentsBlock}`
        : `Please inspect the attached content:\n${attachmentsBlock}`;
    }

    const currentAttachments = [...pastedAttachments];
    setPastedAttachments([]);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage = {
      role: 'user',
      content: textToSend || 'Sent attached content',
      pastedAttachments: currentAttachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);

    // Placeholder for assistant streaming response
    const assistantIndex = newMessages.length;
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      steps: [],
      stats: null,
      suggestedNext: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...newMessages, assistantPlaceholder]);

    abortControllerRef.current = new AbortController();

    let accumulatedText = '';
    let executedSteps = [];
    let threadIdReceived = currentThread?.id || null;

    try {
      await streamChat({
        message: agentPrompt,
        threadId: threadIdReceived,
        model: modelToUse,
        projectId: activeProject?.id || 'default',
        allowWeb,
        signal: abortControllerRef.current.signal,
        onLimitExceeded: (limitData) => {
          setRateLimitNotice(limitData);
          setLastFailedPrompt(lastPromptSentRef.current);
        },
        onThread: (data) => {
          if (data && data.thread_id) {
            threadIdReceived = data.thread_id;
            if (!currentThread) {
              setCurrentThread({ id: data.thread_id, title: (textToSend || 'Attached Snippet').slice(0, 40) });
              onRefreshThreads?.();
            }
          }
        },
        onStep: (stepData) => {
          executedSteps.push(stepData);
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                steps: [...executedSteps]
              };
            }
            return copy;
          });
        },
        onToken: (token) => {
          accumulatedText += token;
          if (
            token.includes('free-models-per-day') ||
            token.includes('Rate limit exceeded') ||
            token.includes('TooManyRequestsResponseError')
          ) {
            setRateLimitNotice({
              provider: 'OpenRouter',
              reason: 'daily_free_limit',
              message: 'OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.',
              alternative: 'gemini-3.8-flash'
            });
            setLastFailedPrompt(lastPromptSentRef.current);
          }
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                content: accumulatedText
              };
            }
            return copy;
          });
        },
        onDone: (doneData) => {
          let suggested = [];
          if (textToSend.toLowerCase().includes('react') || accumulatedText.toLowerCase().includes('hook')) {
            suggested = ["Compare with useEffect ->", "Write a custom hook ->", "Explain performance tradeoffs ->"];
          } else if (textToSend.toLowerCase().includes('summarize') || textToSend.toLowerCase().includes('document')) {
            suggested = ["Extract top 3 key findings ->", "Format as executive bullet points ->"];
          } else {
            suggested = ["Dive deeper into this ->", "Show a practical example ->", "What are the common pitfalls? ->"];
          }

          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                stats: doneData,
                suggestedNext: suggested
              };
            }
            return copy;
          });
          setIsGenerating(false);
          onRefreshThreads?.();
        },
        onError: (err) => {
          const errStr = String(err || '');
          if (
            errStr.includes('free-models-per-day') ||
            errStr.includes('Rate limit exceeded') ||
            errStr.includes('TooManyRequests')
          ) {
            setRateLimitNotice({
              provider: 'OpenRouter',
              reason: 'daily_free_limit',
              message: 'OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.',
              alternative: 'gemini-3.8-flash'
            });
            setLastFailedPrompt(lastPromptSentRef.current);
          }
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                content: accumulatedText ? `${accumulatedText}\n\n*[Notice: ${err}]*` : `Error: ${err}`
              };
            }
            return copy;
          });
          setIsGenerating(false);
        }
      });
    } catch (e) {
      console.error('Chat error:', e);
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      await uploadDocument(file, activeProject?.id || 'default');
      setUploadStatus(`Saved ${file.name} to knowledge vault!`);
      setTimeout(() => setUploadStatus(null), 3500);
    } catch (err) {
      setUploadStatus(`Upload failed: ${err.message}`);
      setTimeout(() => setUploadStatus(null), 4000);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] relative overflow-hidden transition-colors">
      {/* Top Breadcrumb & Engine Bar */}
      <div className="h-14 border-b border-[#EFE8DE] dark:border-[#2C241E] px-6 flex items-center justify-between bg-[#FCFAF7]/90 dark:bg-[#1A1613]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[#7A6E65] dark:text-[#A89D93]">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-[#2D2621] dark:text-[#FAF7F2] font-semibold">
              {currentThread?.title || (activeProject ? activeProject.name : 'New Session')}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3ECE2] dark:bg-[#2B231D] text-[#8C5D39] dark:text-[#E07A5F] font-medium text-[11px]">
            {selectedModel.startsWith('gemini') ? (
              <>
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="font-semibold text-amber-700 dark:text-amber-400">Gemini (Direct API)</span>
              </>
            ) : (
              <>
                <Cpu className="w-3 h-3" />
                <span>{selectedModel.split('/').pop().replace(':free', '')}</span>
              </>
            )}
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="relative">
              <select
                value={activeProject?.id || 'default'}
                onChange={(e) => {
                  const p = projects.find(proj => proj.id === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="text-xs bg-[#F2ECE1] dark:bg-[#2B231D] border border-[#E5DACD] dark:border-[#3D332A] rounded-lg px-2.5 py-1.5 text-[#2D2621] dark:text-[#F5EFEB] font-medium cursor-pointer focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick link to Files Vault */}
          <button
            onClick={onOpenFilesVault}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#7A6E65] dark:text-[#A89D93] hover:bg-[#F2ECE1] dark:hover:bg-[#28211B] transition-colors cursor-pointer"
            title="Browse all project files (code, images, PDFs)"
          >
            <Layers className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span className="hidden sm:inline">Files</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setCurrentThread(null);
                setPastedAttachments([]);
              }}
              className="p-1.5 rounded-lg text-[#8C7E74] hover:text-red-500 hover:bg-[#F2ECE1] dark:hover:bg-[#28211B] transition-colors cursor-pointer"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Upload status banner if active */}
      {uploadStatus && (
        <div className="bg-[#E07A5F] text-white text-xs px-4 py-2 flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2">
            {uploadingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{uploadStatus}</span>
          </div>
          <button onClick={() => setUploadStatus(null)} className="text-white/80 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* Main Messages & Canvas Container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-56 lg:pb-36">
        {messages.length === 0 ? (
          /* Empty / Welcome state */
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-center pt-8 md:pt-14 text-center">
            <div className="mb-4">
              <RobotMascot className="w-36 h-36 md:w-44 md:h-44" />
            </div>

            <div className="space-y-1 mb-8">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2] flex items-center justify-center gap-2">
                <span>Hello, Kader</span>
                <span className="inline-block animate-bounce origin-bottom-right">👋</span>
              </h1>
              <p className="text-sm md:text-base text-[#7A6E65] dark:text-[#A89D93]">
                I'm your AI assistant. How can I help you today?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {quickPrompts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] hover:border-[#E07A5F]/50 dark:hover:border-[#E07A5F]/50 hover:shadow-sm text-left transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-[#2D2621] dark:text-[#FAF7F2]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Messages Stream */
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const { text: userText, attachments: userAttachments } = isUser
                ? parseUserContent(msg)
                : { text: '', attachments: [] };

              return (
                <div
                  key={index}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E07A5F] to-[#F4A261] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Sparkles className="w-4 h-4 fill-white/80" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[78%]`}>
                    {/* User message bubble */}
                    {isUser ? (
                      <div className="self-end bg-[#F2ECE1] dark:bg-[#2B231D] text-[#2D2621] dark:text-[#FAF7F2] px-4 py-3 rounded-2xl rounded-tr-sm border border-[#E9E0D4] dark:border-[#382F28] text-sm leading-relaxed shadow-xs space-y-2.5">
                        {userText && <p className="whitespace-pre-wrap">{userText}</p>}

                        {/* Claude-style attached cards in user message */}
                        {userAttachments.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {userAttachments.map((att, aIdx) => (
                              <div
                                key={aIdx}
                                onClick={() => setActivePastedModal(att)}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-[#1E1915] border border-[#E0D5C7] dark:border-[#3A3027] hover:border-[#E07A5F] transition-all cursor-pointer group shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-[#FAF5EE] dark:bg-[#2B231D] text-[#E07A5F] flex items-center justify-center shrink-0">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="truncate">
                                    <span className="font-semibold text-xs text-[#2D2621] dark:text-[#FAF7F2] block truncate group-hover:text-[#E07A5F]">
                                      {att.title}
                                    </span>
                                    <span className="text-[10px] text-[#8A7D73]">
                                      {att.lines} lines · {att.sizeKb} KB · Click to view
                                    </span>
                                  </div>
                                </div>
                                <Eye className="w-3.5 h-3.5 text-[#9A8D83] group-hover:text-[#E07A5F] shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.timestamp && (
                          <div className="text-[10px] text-[#9A8D83] dark:text-[#7A6F66] text-right mt-1">
                            {msg.timestamp}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Assistant message content */
                      <div className="flex flex-col gap-3">
                        {/* Collapsible Thought Steps */}
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="rounded-xl border border-[#EAE1D4] dark:border-[#362D25] bg-[#FAF6F0] dark:bg-[#221B17] overflow-hidden text-xs">
                            <button
                              onClick={() => {
                                setExpandedThoughts((prev) => ({
                                  ...prev,
                                  [index]: !prev[index]
                                }));
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-[#8A7B70] dark:text-[#A89A8F] hover:bg-[#F2ECE1] dark:hover:bg-[#28211B] font-medium transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>
                                  Thought for {msg.stats?.seconds || '1.2'}s · {msg.steps.length} {msg.steps.length === 1 ? 'step' : 'steps'}
                                </span>
                              </div>
                              {expandedThoughts[index] ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {expandedThoughts[index] && (
                              <div className="p-3 border-t border-[#EAE1D4] dark:border-[#362D25] space-y-2 bg-white/60 dark:bg-[#1B1512]/60 font-mono text-[11px] text-[#6A5E54] dark:text-[#B0A499]">
                                {msg.steps.map((st, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-2">
                                    <span className="text-[#E07A5F] font-bold">›</span>
                                    <div>
                                      <span className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">{st.tool || st}</span>
                                      {st.args && (
                                        <span className="text-[#8A7D73] ml-1.5">
                                          ({JSON.stringify(st.args)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Markdown / Code Body */}
                        <div className="bg-white dark:bg-[#201A16] px-5 py-4 rounded-2xl rounded-tl-sm border border-[#EFE8DE] dark:border-[#2C241E] text-sm text-[#2D2621] dark:text-[#F5EFEB] leading-relaxed shadow-xs space-y-3">
                          {msg.content ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeContent = String(children).replace(/\n$/, '');

                                  if (inline) {
                                    return (
                                      <code className="px-1.5 py-0.5 rounded-md bg-[#F2ECE1] dark:bg-[#2F2721] text-[#E07A5F] dark:text-[#F4A261] font-mono text-[13px]" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }

                                  return (
                                    <CodeBlock
                                      language={match ? match[1] : 'code'}
                                      code={codeContent}
                                      defaultCollapsed={false}
                                    />
                                  );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                                a: ({ href, children }) => (
                                  <a href={href} target="_blank" rel="noreferrer" className="text-[#E07A5F] hover:underline font-medium">
                                    {children}
                                  </a>
                                )
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            <div className="flex items-center gap-2 text-[#8A7D73] text-xs py-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span>Generating response...</span>
                            </div>
                          )}
                        </div>

                        {/* Suggested Next Actions */}
                        {msg.suggestedNext && msg.suggestedNext.length > 0 && !isGenerating && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-semibold tracking-wide text-[#8A7D73] uppercase">
                              SUGGESTED NEXT:
                            </span>
                            {msg.suggestedNext.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSend(sug.replace(' ->', ''))}
                                className="px-3 py-1 text-xs rounded-full bg-[#F3ECE2] dark:bg-[#28211B] hover:bg-[#EAE1D3] dark:hover:bg-[#342B24] text-[#2D2621] dark:text-[#FAF7F2] font-medium border border-[#E5DACD] dark:border-[#3D332A] transition-colors cursor-pointer"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Action Toolbar & Stats */}
                        {msg.content && !isGenerating && (
                          <div className="flex items-center justify-between text-xs text-[#8A7D73] dark:text-[#80746A] px-1">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleCopy(msg.content, index)}
                                className="hover:text-[#2D2621] dark:hover:text-[#FAF7F2] transition-colors cursor-pointer flex items-center gap-1"
                                title="Copy response"
                              >
                                {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setLikedMap(prev => ({ ...prev, [index]: 'up' }))}
                                className={`hover:text-[#2D2621] dark:hover:text-[#FAF7F2] transition-colors cursor-pointer ${
                                  likedMap[index] === 'up' ? 'text-emerald-500' : ''
                                }`}
                                title="Good response"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setLikedMap(prev => ({ ...prev, [index]: 'down' }))}
                                className={`hover:text-[#2D2621] dark:hover:text-[#FAF7F2] transition-colors cursor-pointer ${
                                  likedMap[index] === 'down' ? 'text-red-500' : ''
                                }`}
                                title="Bad response"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const lastUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
                                  if (lastUserMsg) handleSend(lastUserMsg.content);
                                }}
                                className="hover:text-[#2D2621] dark:hover:text-[#FAF7F2] transition-colors cursor-pointer"
                                title="Regenerate"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {msg.stats && (
                              <div
                                className="flex items-center gap-1.5 text-[11px] text-[#9A8D83]"
                                title={`Generated: ${msg.stats.usage?.output_tokens || 0} tokens | Context/Prompt: ${msg.stats.usage?.input_tokens || 0} tokens | Total processed: ${msg.stats.usage?.total_tokens || 0} tokens`}
                              >
                                <Clock className="w-3 h-3 text-[#E07A5F]" />
                                <span>{msg.stats.seconds}s</span>
                                <span>·</span>
                                <span className="font-medium text-[#2D2621] dark:text-[#FAF7F2]">
                                  {msg.stats.usage?.output_tokens
                                    ? `${msg.stats.usage.output_tokens} tokens generated`
                                    : `${msg.stats.usage?.total_tokens || 320} tokens`}
                                </span>
                                {msg.stats.usage?.input_tokens > 0 && (
                                  <span className="text-[#8A7D73] text-[10px]">
                                    ({(msg.stats.usage.input_tokens / 1000).toFixed(1)}k prompt ctx)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#E5DCD0] dark:bg-[#382F27] text-[#5C4F44] dark:text-[#D5C9BD] font-semibold text-xs flex items-center justify-center shrink-0 border border-white/60 dark:border-black/30 mt-1">
                      AK
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating / Docked Input Bar with Claude-style Pasted Cards */}
      <div className="absolute bottom-14 lg:bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2]/95 to-transparent dark:from-[#141210] dark:via-[#141210]/95 pointer-events-none z-20">
        <div className="max-w-3xl mx-auto pointer-events-auto space-y-2">
          {/* Rate Limit / Quota Banner */}
          {rateLimitNotice && (
            <div className="p-3 md:p-3.5 rounded-2xl bg-[#FFF9EE] dark:bg-[#2A2016] border border-amber-300 dark:border-amber-700/80 shadow-md backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-950 dark:text-amber-100">
                      {rateLimitNotice.provider || 'AI'} Quota Notice
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                      {rateLimitNotice.reason || 'rate-limit'}
                    </span>
                  </div>
                  <p className="text-amber-900/80 dark:text-amber-200/90 text-[11px] mt-0.5 leading-snug">
                    {rateLimitNotice.message || 'Model request limit reached. Switch to Gemini 3.5 Flash for high free limits!'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const alt = rateLimitNotice.alternative || 'gemini-3.5-flash';
                    setSelectedModel(alt);
                    const promptToRetry = lastFailedPrompt;
                    setRateLimitNotice(null);
                    setLastFailedPrompt(null);
                    if (promptToRetry) {
                      setTimeout(() => {
                        handleSend(promptToRetry, alt);
                      }, 100);
                    }
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                  <span>Switch to Gemini 3.5 Flash ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRateLimitNotice(null)}
                  className="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  title="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Input Box */}
          <div className="p-2.5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#E5DACD] dark:border-[#382F27] shadow-lg flex flex-col gap-2 transition-all focus-within:border-[#E07A5F] dark:focus-within:border-[#E07A5F]">
            {/* Claude-style Pasted Content Attached Pills */}
            {pastedAttachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-1 pt-1 pb-2 border-b border-[#F2ECE1] dark:border-[#2C241E]">
                {pastedAttachments.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => setActivePastedModal(att)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF5EE] dark:bg-[#2B231D] border border-[#E9DFCF] dark:border-[#3A3027] hover:border-[#E07A5F] text-xs cursor-pointer transition-colors group shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#E07A5F]" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#2D2621] dark:text-[#FAF7F2] max-w-[200px] truncate group-hover:text-[#E07A5F]">
                        {att.title}
                      </span>
                      <span className="text-[10px] text-[#8A7D73]">
                        {att.lines} lines · {att.sizeKb} KB (click to view)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPastedAttachments(prev => prev.filter(a => a.id !== att.id));
                      }}
                      className="p-1 text-[#9A8D83] hover:text-red-500 rounded-md transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Textarea with onPaste Interceptor */}
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder={pastedAttachments.length > 0 ? "Add your instruction for this content..." : "Ask anything... (paste large text/code to attach)"}
              className="w-full bg-transparent px-3 py-1.5 text-sm text-[#2D2621] dark:text-[#FAF7F2] placeholder-[#9A8D83] focus:outline-none resize-none max-h-44 leading-relaxed"
            />

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-[#F2ECE1] dark:border-[#2C241E]">
              {/* Left tools: Attachment, Web Search, Model Badge */}
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.pdf,.py,.js,.jsx,.ts,.tsx,.json,.html,.css,.sql,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  type="button"
                  className="p-1.5 rounded-lg text-[#8A7D73] hover:text-[#2D2621] dark:hover:text-[#FAF7F2] hover:bg-[#F3ECE2] dark:hover:bg-[#2B231D] transition-colors cursor-pointer"
                  title="Attach file (code, image, or PDF)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Web Search toggle */}
                <button
                  type="button"
                  onClick={() => setAllowWeb(!allowWeb)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    allowWeb
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'text-[#8A7D73] hover:bg-[#F3ECE2] dark:hover:bg-[#2B231D]'
                  }`}
                  title="Toggle web search on/off"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{allowWeb ? 'Web ON' : 'Web OFF'}</span>
                </button>

                {/* Model dropdown with Provider optgroups */}
                <div className="relative flex items-center">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="text-[11px] max-w-[125px] xs:max-w-[160px] sm:max-w-none bg-[#F3ECE2] dark:bg-[#2B231D] border border-[#E5DACD] dark:border-[#382F27] rounded-lg px-2 py-1 text-[#6B5E54] dark:text-[#A89D93] font-medium cursor-pointer focus:outline-none hover:border-[#E07A5F] transition-colors truncate"
                  >
                    {availableModels.some(m => m.provider === 'Google') && (
                      <optgroup label="⚡ Google Gemini (Direct API)">
                        {availableModels
                          .filter(m => m.provider === 'Google')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.id}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {availableModels.some(m => m.provider !== 'Google') && (
                      <optgroup label="🌐 OpenRouter Models">
                        {availableModels
                          .filter(m => m.provider !== 'Google')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.id}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Right tools: Shortcut hint & Send button */}
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-[11px] text-[#A89D93]">
                  Ctrl + Enter
                </span>

                <button
                  onClick={() => handleSend()}
                  disabled={(!inputMessage.trim() && pastedAttachments.length === 0) || isGenerating}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all cursor-pointer ${
                    (inputMessage.trim() || pastedAttachments.length > 0) && !isGenerating
                      ? 'bg-[#E07A5F] hover:bg-[#D56B50] shadow-xs active:scale-95'
                      : 'bg-[#D9CFC4] dark:bg-[#3D342C] cursor-not-allowed opacity-70'
                  }`}
                  aria-label="Send message"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-[#9A8D83]">
            <Lock className="w-3 h-3" />
            <span>Your conversations are private, encrypted, and isolated to your workspace</span>
          </div>
        </div>
      </div>

      {/* Claude-style Pasted Content Modal */}
      <PastedContentModal
        isOpen={!!activePastedModal}
        onClose={() => setActivePastedModal(null)}
        content={activePastedModal?.content}
        title={activePastedModal?.title || "Pasted Content"}
      />
    </div>
  );
}
