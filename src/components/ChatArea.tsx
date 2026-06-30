import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Cpu, Copy, Check, Sparkles, MessageSquare, ArrowRight, CornerDownLeft, AlertCircle, Edit2, Trash2, RotateCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Chat, Message } from '../types';
import { splitMessageContent } from '../utils/canvasParser';

interface ChatAreaProps {
  chat: Chat | null;
  selectedModel: string;
  onSendPrompt: (prompt: string) => void;
  isGenerating: boolean;
  isCheckingSafety?: boolean; // Dynamic child safety classifier state
  onOpenSettings: () => void;
  demoMode: boolean;
  modelsCount: number;
  onOpenCanvas: (title: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRerunMessage: (messageId: string) => void;
  
  // Custom kid prop
  isKidMode?: boolean;
}

// Format message rendering with customized canvas indicators and kid mode aesthetics
function FormattedMessage({ 
  content, 
  onOpenCanvas, 
  isKidMode = false 
}: { 
  content: string; 
  onOpenCanvas: (title: string) => void;
  isKidMode?: boolean;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  // Split by Canvas Macro using the balanced bracket parser
  const canvasParts = splitMessageContent(content);

  return (
    <div className={`space-y-3 leading-relaxed text-[13px] md:text-sm ${isKidMode ? 'text-pink-100' : 'text-zinc-200'}`}>
      {canvasParts.map((part, canvasIndex) => {
        if (part.type === 'canvas') {
          const title = part.title || 'Untitled Board';
          
          let actionLabel = isKidMode ? 'Created new board!' : 'Created new canvas';
          if (part.command === 'edit') actionLabel = isKidMode ? 'Board updated!' : 'Canvas updated';
          else if (part.command === 'append') actionLabel = isKidMode ? 'Appended to board!' : 'Appended to canvas';

          return (
            <div 
              key={`canvas-${canvasIndex}`} 
              onClick={() => onOpenCanvas(title.trim())}
              className={`my-2 p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm max-w-sm inline-flex w-full select-none ${
                isKidMode
                  ? 'border-pink-800 bg-pink-900/40 hover:bg-pink-850/40 hover:border-pink-400'
                  : 'border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/30 hover:border-indigo-500/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 transition-all ${
                  isKidMode
                    ? 'bg-pink-500/20 border-pink-500/30 text-white group-hover:bg-pink-600'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                }`}>
                  <span className="text-xs">🎨</span>
                </div>
                <div className="min-w-0 flex flex-col text-left">
                  <span className={`text-[11px] font-bold truncate transition font-sans ${
                    isKidMode ? 'text-pink-100 group-hover:text-white' : 'text-zinc-200 group-hover:text-indigo-300'
                  }`}>{title.trim()}</span>
                  <span className={`text-[9px] truncate font-mono ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                    {actionLabel}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[9px] transition font-bold ${isKidMode ? 'text-pink-300 group-hover:text-white' : 'text-zinc-500 group-hover:text-indigo-400'}`}>
                  {isKidMode ? 'View 🐾' : 'Open'}
                </span>
                <span className={`text-[10px] transition-all font-bold ${isKidMode ? 'text-pink-400 group-hover:text-pink-300' : 'text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5'}`}>&rarr;</span>
              </div>
            </div>
          );
        }

        const textPart = part.content;

        // Split by code blocks for the text portion
        const parts = textPart.split(/(```[\s\S]*?```)/g);

        return (
          <React.Fragment key={`text-block-${canvasIndex}`}>
            {parts.map((subPartString, index) => {
              const isCodeBlock = subPartString.startsWith('```') && subPartString.endsWith('```');

              if (isCodeBlock) {
                const match = subPartString.match(/```(\w*)\n([\s\S]*?)```/);
                const lang = match ? match[1] : '';
                const code = match ? match[2] : subPartString.slice(3, -3);

                return (
                  <div 
                    key={index} 
                    className={`my-3 rounded-xl border overflow-hidden font-mono text-xs shadow-md ${
                      isKidMode ? 'border-pink-850 bg-pink-900/60' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <div className={`flex items-center justify-between px-4 py-2 border-b text-[10px] uppercase font-bold tracking-wider select-none ${
                      isKidMode ? 'bg-pink-850/80 border-pink-800 text-pink-200' : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400'
                    }`}>
                      <span>{lang || 'code'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(code, index);
                        }}
                        className={`flex items-center gap-1 transition px-1.5 py-0.5 rounded ${
                          isKidMode ? 'hover:bg-pink-800 text-pink-100 hover:text-white' : 'hover:text-white hover:bg-zinc-800/60'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className={`p-4 overflow-x-auto leading-normal whitespace-pre ${isKidMode ? 'text-pink-100' : 'text-zinc-300'}`}>
                      <code>{code.trim()}</code>
                    </pre>
                  </div>
                );
              }

              const inlineParts = subPartString.split(/(`[^`]+`)/g);

              return (
                <p key={index} className="whitespace-pre-line leading-relaxed mb-3 last:mb-0">
                  {inlineParts.map((subPart, subIndex) => {
                    const isInlineCode = subPart.startsWith('`') && subPart.endsWith('`');
                    if (isInlineCode) {
                      return (
                        <code 
                          key={subIndex} 
                          className={`mx-0.5 rounded px-1.5 py-0.5 font-mono text-[12px] border ${
                            isKidMode
                              ? 'bg-pink-900 text-pink-200 border-pink-800'
                              : 'bg-zinc-800 text-indigo-300 border-zinc-700/30'
                          }`}
                        >
                          {subPart.slice(1, -1)}
                        </code>
                      );
                    }

                    const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
                    return boldParts.map((boldPart, boldIndex) => {
                      const isBold = boldPart.startsWith('**') && boldPart.endsWith('**');
                      if (isBold) {
                        return (
                          <strong key={boldIndex} className={`font-black ${isKidMode ? 'text-white' : 'text-white'}`}>
                            {boldPart.slice(2, -2)}
                          </strong>
                        );
                      }
                      return boldPart;
                    });
                  })}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const KID_STARTER_PROMPTS = [
  {
    title: 'Explain Gravity! 🍎🚀',
    desc: 'Why do things fall down?',
    prompt: 'Why do things fall down to the ground when I drop them? Tell me in a super fun, safe, kid-friendly way!',
  },
  {
    title: 'What is a rainbow? 🌈',
    desc: 'Why does the sky have colors?',
    prompt: 'Can you explain why rainbows have so many beautiful colors in a super simple, exciting way?',
  },
  {
    title: 'Tell me a fun story! 📖✨',
    desc: 'A story about a cat puppy!',
    prompt: 'Write a super fun, safe short story about a brave little puppy who discovered a secret treehouse in the magical backyard!',
  },
  {
    title: 'Let\'s play a game! 🎲🐶',
    desc: 'Guess the animal game!',
    prompt: 'Let\'s play a fun, safe guessing game! You pick a secret animal and I will ask questions to guess what it is!',
  },
];

const ADULT_STARTER_PROMPTS = [
  {
    title: 'Explain Rayleigh scattering',
    desc: 'Why is the sky blue?',
    prompt: 'Why is the sky blue? Break it down step-by-step.',
  },
  {
    title: 'Write a TypeScript helper',
    desc: 'Create a clean debounce function',
    prompt: 'Write a typescript debounce helper function and explain how to use it.',
  },
  {
    title: 'Write a Fibonacci sequence',
    desc: 'Implement in JS or Python',
    prompt: 'Can you show me a function to calculate the fibonacci sequence up to N terms in TypeScript?',
  },
  {
    title: 'What are you capable of?',
    desc: 'Discover features and helper utilities',
    prompt: 'What are you capable of? What kind of software development or writing tasks do you do best?',
  },
];

export default function ChatArea({
  chat,
  selectedModel,
  onSendPrompt,
  isGenerating,
  isCheckingSafety = false,
  onOpenSettings,
  demoMode,
  modelsCount,
  onOpenCanvas,
  onEditMessage,
  onDeleteMessage,
  onRerunMessage,
  isKidMode = false,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Auto-scroll on new message chunks or completions
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages, isGenerating, isCheckingSafety]);

  const starters = isKidMode ? KID_STARTER_PROMPTS : ADULT_STARTER_PROMPTS;

  // Welcome state rendering
  if (!chat || chat.messages.length === 0) {
    return (
      <div className={`flex-1 overflow-y-auto px-4 py-8 flex items-center justify-center ${isKidMode ? 'bg-pink-950/10' : 'bg-zinc-900/20'}`}>
        <div className="max-w-2xl w-full text-center space-y-8 select-none">
          
          {/* Main Title Badge */}
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold shadow-md animate-bounce duration-1000 ${
            isKidMode
              ? 'border-pink-500 bg-pink-600 text-white'
              : demoMode
                ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-300'
                : 'border-indigo-500/20 bg-indigo-500/5 text-indigo-300'
          }`}>
            {isKidMode ? (
              <span>✨ Let's learn and play together! ✨</span>
            ) : demoMode ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Virtual Sandbox Mode Activated</span>
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" />
                <span>Local Ollama Client Active</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <h1 className={`text-3xl md:text-4xl font-black tracking-tight font-sans ${isKidMode ? 'text-pink-100' : 'text-white'}`}>
              {isKidMode ? 'My Friendly AI Playground 🎈🐾' : 'Ollama Model Interface'}
            </h1>
            <p className={`text-xs md:text-sm max-w-lg mx-auto leading-relaxed font-medium ${isKidMode ? 'text-pink-200' : 'text-zinc-400'}`}>
              {isKidMode 
                ? 'Talk to your friendly AI buddy, write amazing stories, and build cool drawing boards! Everything is safe, secure, and fun!' 
                : 'Interact directly with offline LLMs running on your local machine. Fully private, lightning-fast inference, zero cloud dependencies.'}
            </p>
          </div>

          {/* Model Status Card */}
          <div className={`rounded-2xl border p-5 max-w-md mx-auto space-y-3 ${
            isKidMode 
              ? 'border-pink-800 bg-pink-900/40 shadow-lg shadow-pink-950/20' 
              : 'border-zinc-800 bg-zinc-950/50'
          }`}>
            <div className="flex items-center gap-3 justify-center text-left">
              <div className={`rounded-xl p-2 border shrink-0 ${isKidMode ? 'bg-pink-950 border-pink-700' : 'bg-zinc-900 border-zinc-800'}`}>
                {isKidMode ? (
                  <span className="text-2xl">🐶</span>
                ) : (
                  <Bot className={`h-6 w-6 ${demoMode ? 'text-amber-400' : 'text-indigo-400'}`} />
                )}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                  {isKidMode ? 'Active AI Buddy' : 'Active Generation Model'}
                </p>
                <p className={`text-sm font-black truncate max-w-[200px] ${isKidMode ? 'text-pink-100' : 'text-zinc-100'}`}>
                  {selectedModel || (demoMode ? isKidMode ? 'Your AI Buddy' : 'Simulating models...' : 'No model selected')}
                </p>
              </div>
            </div>

            {!demoMode && modelsCount === 0 && (
              <div className="pt-2 text-left">
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">No AI Buddies Installed</span>
                    We couldn't detect any models in Ollama. Pull a model like <strong>llama3</strong> or <strong>gemma</strong> to start chatting!
                  </div>
                </div>
                <button
                  id="open-settings-from-warning"
                  onClick={onOpenSettings}
                  className={`w-full mt-2.5 rounded-xl py-2 text-xs font-bold transition active:scale-98 cursor-pointer ${
                    isKidMode 
                      ? 'bg-pink-600 hover:bg-pink-500 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  Configure AI Buddies
                </button>
              </div>
            )}
          </div>

          {/* Suggestions Grid */}
          <div className="space-y-3">
            <p className={`text-xs font-bold uppercase tracking-wider ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
              {isKidMode ? '🌟 Pick a fun topic below!' : 'Suggested Prompts'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {starters.map((starter, i) => (
                <button
                  key={i}
                  id={`starter-prompt-${i}`}
                  onClick={() => onSendPrompt(starter.prompt)}
                  className={`group rounded-2xl border p-3.5 transition cursor-pointer text-left flex flex-col justify-between h-24 shadow-sm duration-150 ${
                    isKidMode 
                      ? 'border-pink-850 bg-pink-900/35 hover:bg-pink-900/60 hover:border-pink-400' 
                      : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-bold transition ${
                      isKidMode ? 'text-pink-100 group-hover:text-white' : 'text-zinc-200 group-hover:text-indigo-400'
                    }`}>{starter.title}</p>
                    <p className={`text-[10px] mt-0.5 line-clamp-2 leading-relaxed ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>{starter.desc}</p>
                  </div>
                  <div className="flex items-center justify-end w-full">
                    <span className={`rounded-full p-1 transition ${
                      isKidMode 
                        ? 'bg-pink-950 group-hover:bg-pink-600 text-pink-300 group-hover:text-white' 
                        : 'bg-zinc-900 group-hover:bg-indigo-600/10 text-zinc-500 group-hover:text-indigo-400'
                    }`}>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div 
      id="chat-messages-container"
      ref={scrollRef} 
      className={`flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scroll-smooth ${
        isKidMode ? 'bg-pink-950/5' : 'bg-zinc-950/20'
      }`}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {chat.messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEditing = editingMessageId === msg.id;
          
          return (
            <div 
              key={msg.id}
              id={`message-bubble-${msg.id}`}
              className={`flex gap-4 items-start ${isUser ? 'flex-row-reverse' : ''} group/msg animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {/* Profile Avatar */}
              <div className={`rounded-xl p-2 shrink-0 border select-none ${
                isUser 
                  ? isKidMode 
                    ? 'bg-pink-700 border-pink-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300' 
                  : isKidMode
                    ? 'bg-pink-900 border-pink-850 text-white'
                    : 'bg-indigo-600/10 border-indigo-500/25 text-indigo-400'
              }`}>
                {isUser ? (
                  isKidMode ? <span className="text-sm">🧒</span> : <User className="h-4 w-4 text-zinc-300" />
                ) : (
                  isKidMode ? <span className="text-sm">🐶</span> : <Bot className="h-4 w-4 text-indigo-400" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div className="flex flex-col max-w-[85%] space-y-1">
                {/* Meta details (sender name and dynamic model label) */}
                <div className={`flex items-center gap-1.5 text-[11px] font-bold tracking-wide select-none ${
                  isUser ? 'justify-end' : 'justify-start'
                } ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                  <span>{isUser ? isKidMode ? 'Me' : 'You' : chat.model.split(':')[0]}</span>
                  {!isUser && (
                    <span className={`border font-mono text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                      isKidMode 
                        ? 'bg-pink-950 border-pink-850 text-pink-300' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}>
                      {isKidMode ? 'Safe' : 'Ollama'}
                    </span>
                  )}
                </div>

                {/* Bubble content row with inline hover actions */}
                <div className={`relative flex items-center gap-2 group/bubble ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Content card */}
                  <div className={`rounded-2xl px-4 py-3 border shadow-md max-w-full ${
                    isUser 
                      ? isKidMode 
                        ? 'bg-pink-700 border-pink-600 text-white rounded-tr-none' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none' 
                      : isKidMode
                        ? 'bg-pink-900/40 border-pink-850 text-pink-100 rounded-tl-none'
                        : 'bg-zinc-950/40 border-zinc-900 text-zinc-200 rounded-tl-none'
                  }`}>
                    {isEditing ? (
                      <div className="flex flex-col gap-2 w-full min-w-[280px] sm:min-w-[400px]">
                        <textarea
                          id={`edit-message-textarea-${msg.id}`}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none min-h-[80px] ${
                            isKidMode
                              ? 'bg-pink-950 border-pink-800 text-pink-100 focus:border-pink-400 font-sans'
                              : 'bg-zinc-950 border-zinc-850 text-zinc-100 focus:border-indigo-500/80 font-mono'
                          }`}
                          rows={Math.max(3, editContent.split('\n').length)}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 text-[10px]">
                          <button
                            id={`cancel-edit-${msg.id}`}
                            onClick={() => setEditingMessageId(null)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
                              isKidMode 
                                ? 'bg-pink-900 border-pink-800 text-pink-200 hover:text-white' 
                                : 'bg-zinc-850 border-zinc-800 text-zinc-300'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            id={`save-edit-${msg.id}`}
                            onClick={() => {
                              if (editContent.trim()) {
                                onEditMessage(msg.id, editContent);
                              }
                              setEditingMessageId(null);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                              isKidMode
                                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-inner'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <FormattedMessage content={msg.content} onOpenCanvas={onOpenCanvas} isKidMode={isKidMode} />
                    )}
                  </div>

                  {/* Message Actions (Edit & Delete) on Hover */}
                  {!isEditing && (
                    <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 flex items-center gap-1 shrink-0 self-center">
                      <button
                        id={`edit-msg-btn-${msg.id}`}
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content);
                        }}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isKidMode
                            ? 'bg-pink-900 border-pink-800 hover:bg-pink-800 text-pink-300 hover:text-white'
                            : 'border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Edit Message"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-msg-btn-${msg.id}`}
                        onClick={() => {
                          if (confirm(isKidMode ? 'Are you sure you want to delete this message?' : 'Are you sure you want to delete this message?')) {
                            onDeleteMessage(msg.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isKidMode
                            ? 'bg-pink-900 border-pink-800 hover:bg-pink-850 text-pink-300 hover:text-rose-400'
                            : 'border-zinc-850 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400'
                        }`}
                        title="Delete Message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Actions (Copy/Rerun) below bubble */}
                <div className={`flex items-center gap-3 pt-1 text-[10px] font-bold select-none ${
                  isUser ? 'justify-end' : 'justify-start'
                } ${isKidMode ? 'text-pink-400 hover:text-pink-300' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {isUser ? (
                    <button
                      id={`copy-prompt-btn-${msg.id}`}
                      type="button"
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>{isKidMode ? 'Copy My Prompt' : 'Copy Prompt'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        id={`copy-response-btn-${msg.id}`}
                        type="button"
                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                        className="flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{isKidMode ? 'Copy Story' : 'Copy Response'}</span>
                          </>
                        )}
                      </button>
                      {!isGenerating && (
                        <button
                          id={`rerun-response-btn-${msg.id}`}
                          type="button"
                          onClick={() => onRerunMessage(msg.id)}
                          className="flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>{isKidMode ? 'Ask Again' : 'Rerun'}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic streaming/safety state loader */}
        {isGenerating && (
          <div className="flex gap-4 items-start animate-pulse">
            <div className={`rounded-xl p-2 shrink-0 border select-none ${
              isKidMode ? 'bg-pink-900 border-pink-800' : 'bg-indigo-600/10 border-indigo-500/25'
            }`}>
              {isKidMode ? <span className="text-sm">🐶</span> : <Bot className="h-4 w-4 text-indigo-400" />}
            </div>
            <div className="flex flex-col max-w-[85%] space-y-1">
              <div className={`text-[11px] font-bold tracking-wide select-none ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                <span>{chat.model.split(':')[0]}</span>
                <span className={`ml-1.5 font-bold uppercase ${isKidMode ? 'text-pink-400 animate-pulse' : 'text-indigo-400'}`}>
                  {isCheckingSafety ? 'Checking...' : 'generating...'}
                </span>
              </div>
              <div className={`rounded-2xl rounded-tl-none px-4 py-3 border shadow-md flex items-center gap-1.5 ${
                isKidMode ? 'bg-pink-900/30 border-pink-850 text-pink-100' : 'bg-zinc-950/40 border-zinc-900 text-zinc-200'
              }`}>
                {isCheckingSafety ? (
                  <span className="h-4.5 w-4.5 border-2 border-t-transparent rounded-full animate-spin border-pink-400 shrink-0 mr-1" />
                ) : (
                  <>
                    <div className={`h-1.5 w-1.5 rounded-full animate-bounce duration-1000 ${isKidMode ? 'bg-pink-400' : 'bg-indigo-400'}`} />
                    <div className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.2s] duration-1000 ${isKidMode ? 'bg-pink-400' : 'bg-indigo-400'}`} />
                    <div className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.4s] duration-1000 ${isKidMode ? 'bg-pink-400' : 'bg-indigo-400'}`} />
                  </>
                )}
                <span className="text-[10px] font-semibold text-zinc-500 font-mono pl-1">
                  {isCheckingSafety ? 'Safety Check in Progress...' : 'Reading from Local Storage...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
