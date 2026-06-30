import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, CornerDownLeft, Plus, X, Sparkles } from 'lucide-react';
import { Canvas } from '../types';

interface ChatInputProps {
  onSendPrompt: (prompt: string) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  selectedModel: string;
  canvasModeActive: boolean;
  onToggleCanvasMode: (active: boolean) => void;
  availableCanvases: Canvas[];
  onAttachCanvas: (canvas: Canvas) => void;
  personalizationEnabled: boolean;
  onTogglePersonalization: () => void;
  onTetherCanvasToNewChat: (canvas: Canvas) => void;
  ollamaUrl: string;
  demoMode: boolean;
  
  // Custom kid prop
  isKidMode?: boolean;
}

export default function ChatInput({
  onSendPrompt,
  isGenerating,
  onStopGeneration,
  selectedModel,
  canvasModeActive,
  onToggleCanvasMode,
  availableCanvases,
  onAttachCanvas,
  personalizationEnabled,
  onTogglePersonalization,
  onTetherCanvasToNewChat,
  ollamaUrl,
  demoMode,
  isKidMode = false,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Close plus menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea heights
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [prompt]);

  const handleImprovePrompt = async () => {
    if (!prompt.trim() || !selectedModel || isImproving) return;

    setIsImproving(true);
    try {
      if (demoMode) {
        // Simulate improving the prompt based on keywords
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading delay
        const cleanedPrompt = prompt.trim();
        const lower = cleanedPrompt.toLowerCase();
        let improved = '';

        const isGreeting = /^(hello|hi|hey|greetings|good\s+morning|good\s+afternoon|good\s+evening|yo)\b/i.test(cleanedPrompt);
        const isHowAreYou = /^(how\s+are\s+you|how's\s+it\s+going|hows\s+it\s+going)\b/i.test(cleanedPrompt);

        if (isGreeting) {
          improved = isKidMode
            ? `Hi! I want to tell you about myself and play a fun, safe game together!`
            : `Hello! I hope you are having a productive day. I would love to collaborate with you to explore your capabilities and begin our workspace session.`;
        } else if (isHowAreYou) {
          improved = isKidMode
            ? `Hi! How are you doing today, my AI buddy? Let's have a fun chat!`
            : `Hello! I hope you are running smoothly today. I'm looking forward to working with you—please let me know how you are doing and how we can best collaborate.`;
        } else if (lower.includes('recipe') || lower.includes('pasta') || lower.includes('cook') || lower.includes('food')) {
          improved = isKidMode
            ? `Please show me a fun, yummy, and easy recipe for delicious Italian pasta that kids can help make with parents!`
            : `Could you please provide a step-by-step, highly detailed recipe and professional cooking guide for making authentic, delicious Italian pasta from scratch? Please include ingredient proportions, chef techniques, and standard serving suggestions.`;
        } else if (lower.includes('code') || lower.includes('function') || lower.includes('algorithm') || lower.includes('program') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('python')) {
          improved = `Please write a highly optimized, production-ready, and well-commented implementation of this program in clean TypeScript. Ensure it handles edge cases, includes type declarations, and explain the time and space complexity of the solution.`;
        } else if (lower.includes('why') || lower.includes('how') || lower.includes('explain') || lower.includes('what is')) {
          improved = isKidMode
            ? `Can you explain this to me in a super simple, easy, and fun way that a kid can easily understand? "${cleanedPrompt}"`
            : `Could you provide a comprehensive, clear, and professionally structured explanation of this topic? Please break down the core scientific or logical concepts, present key points in a scannable format, and address common misconceptions.`;
        } else if (lower.includes('email') || lower.includes('letter') || lower.includes('write a')) {
          improved = isKidMode
            ? `Can you write a super polite and friendly message to my friend about: ${cleanedPrompt}?`
            : `Could you please draft a professional, polite, and persuasive communication for this scenario? Ensure the tone is appropriate for a business setting, clearly articulates the primary message, and ends with a polite call to action.`;
        } else if (cleanedPrompt.length < 15) {
          improved = isKidMode
            ? `Tell me some super interesting and fun facts about "${cleanedPrompt}"!`
            : `Could you please provide an elegant, professional, and comprehensive overview of the following topic: "${cleanedPrompt}"? Please outline key insights and important concepts.`;
        } else {
          improved = isKidMode
            ? `Help me write a super fun and creative response about: ${cleanedPrompt}`
            : `I would appreciate it if you could write a polished, professional, and detailed response addressing: ${cleanedPrompt.charAt(0).toLowerCase() + cleanedPrompt.slice(1)}`;
        }

        setPrompt(improved);
      } else {
        // Real Ollama prompt improvement!
        const systemPrompt = isKidMode 
          ? `You are a super friendly prompt engineer for kids. Your job is to rewrite the child's input prompt to make it fun, clear, exciting, and completely kid-safe, optimized for large language models.
Follow these strict rules:
1. Always keep the rewritten prompt 100% safe, educational, and positive.
2. If the input is a simple greeting, keep it cute and friendly.
3. Respond with ONLY the rewritten prompt. No commentary.`
          : `You are an expert prompt engineer. Your job is to rewrite the user's input prompt to make it clearer, more elegant, professional, and optimized for large language models.
 
Follow these strict rules:
1. If the input is a simple greeting, short conversation opener, or polite statement (e.g., "hello", "hi", "hey there", "how's it going"), DO NOT transform it into a complex query or request for analysis. Simply polish it into a warm, professional, and elegant equivalent greeting or opening statement. For example, "hello" should become "Hello! I am ready to begin our session. I look forward to working with you."
2. If the input contains a question, task, or request, clarify its phrasing, make it professional, and specify helpful guidelines (like asking for clear structure, step-by-step formatting, or code comments if applicable), but keep the original intent completely unchanged.
3. Respond with ONLY the rewritten prompt itself. Do NOT include any introductory or concluding text, explanations, code blocks, or markdown commentary. Just return the raw text.`;

        const improvementPrompt = `Please rewrite the following user prompt to be better:\n\n"${prompt.trim()}"`;

        let result = '';
        const { streamOllamaGenerate } = await import('../utils/ollama');
        
        await streamOllamaGenerate(
          ollamaUrl,
          selectedModel,
          `${systemPrompt}\n\nUser Prompt: ${improvementPrompt}`,
          (chunk) => {
            result += chunk;
          }
        );

        let cleanedResult = result.trim();
        if ((cleanedResult.startsWith('"') && cleanedResult.endsWith('"')) || 
            (cleanedResult.startsWith("'") && cleanedResult.endsWith("'"))) {
          cleanedResult = cleanedResult.slice(1, -1).trim();
        }

        if (cleanedResult) {
          setPrompt(cleanedResult);
        }
      }
    } catch (err: any) {
      console.error('Failed to improve prompt:', err);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onSendPrompt(prompt.trim());
    setPrompt('');
    
    // Reset height of textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`border-t p-4 ${isKidMode ? 'border-pink-850 bg-pink-950/20' : 'border-zinc-900 bg-zinc-950/40'}`}>
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative animate-in slide-in-from-bottom-2 duration-200">
        <div className={`relative flex items-end rounded-2xl border px-3.5 py-3 shadow-2xl transition-all ${
          isKidMode
            ? 'border-pink-800 bg-pink-900/60 focus-within:border-pink-500 shadow-pink-950/20'
            : 'border-zinc-800 bg-zinc-950 focus-within:border-indigo-500/80'
        }`}>
          
          {/* Plus / Canvas Option Area */}
          <div className="relative mr-2 pb-0.5 shrink-0 flex items-center gap-1.5" ref={plusMenuRef}>
            {canvasModeActive && (
              <button
                id="canvas-active-indicator"
                type="button"
                onClick={() => onToggleCanvasMode(false)}
                className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer select-none border ${
                  isKidMode
                    ? 'bg-pink-600 border-pink-400 text-white hover:bg-rose-500'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                }`}
                title="Canvas Mode Active! Click to turn off."
              >
                <span>{isKidMode ? '🎨 Board Active' : '🎨 Canvas'}</span>
              </button>
            )}
            <button
              id="plus-menu-btn"
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`rounded-xl p-2 border transition cursor-pointer flex items-center justify-center active:scale-95 ${
                isKidMode
                  ? 'bg-pink-700 border-pink-500 text-pink-100 hover:text-white hover:border-pink-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
              }`}
              title={isKidMode ? "Boards & Settings" : "Add Canvas / Options"}
            >
              <Plus className="h-4 w-4" />
            </button>

            {showPlusMenu && (
              <div 
                id="plus-menu-popup"
                className={`absolute bottom-12 left-0 z-40 w-56 rounded-2xl border p-2 shadow-2xl animate-in fade-in duration-150 ${
                  isKidMode 
                    ? 'border-pink-850 bg-pink-900 text-white' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-100'
                }`}
              >
                <div className={`px-2 py-1 border-b mb-1.5 flex items-center justify-between select-none ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isKidMode ? 'text-pink-200' : 'text-zinc-500'}`}>
                    {isKidMode ? 'Drawing Tools 🖍️' : 'Canvas Tools'}
                  </span>
                  <button type="button" onClick={() => setShowPlusMenu(false)} className={isKidMode ? 'text-pink-300 hover:text-white' : 'text-zinc-500 hover:text-zinc-300'}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
                
                <button
                  id="plus-menu-toggle-canvas"
                  type="button"
                  onClick={() => {
                    onToggleCanvasMode(!canvasModeActive);
                    setShowPlusMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition text-left ${
                    canvasModeActive
                      ? isKidMode 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                      : isKidMode
                        ? 'text-pink-100 hover:bg-pink-850'
                        : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-sm">🎨</span>
                  <div className="flex flex-col text-left">
                    <span>{canvasModeActive ? isKidMode ? 'Turn off Board' : 'Deactivate Canvas' : isKidMode ? 'Turn on Board' : 'Activate Canvas'}</span>
                    <span className={`text-[9px] ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                      {isKidMode ? 'Enables fun story canvas!' : 'Injects @CANVAS format instructions'}
                    </span>
                  </div>
                </button>

                {/* Personalization Toggle */}
                <div className={`mt-2 pt-2 border-t select-none ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
                  <div className="flex items-center justify-between px-2.5 py-1">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold text-zinc-300">{isKidMode ? 'AI Memory 🧠' : 'Personalization'}</span>
                      <span className={`text-[8px] ${isKidMode ? 'text-pink-300' : 'text-zinc-500'}`}>
                        {isKidMode ? 'Remember my details' : 'Inject user memories'}
                      </span>
                    </div>
                    <button
                      id="personalization-toggle-btn"
                      type="button"
                      onClick={onTogglePersonalization}
                      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        personalizationEnabled 
                          ? isKidMode ? 'bg-pink-500' : 'bg-indigo-600' 
                          : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          personalizationEnabled ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Detached Canvases: Tether to New Chat */}
                {availableCanvases.filter(c => !c.chatId).length > 0 && (
                  <div className={`mt-2 pt-2 border-t ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
                    <div className="px-2 pb-1 select-none text-left">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isKidMode ? 'text-pink-200' : 'text-amber-500'}`}>
                        {isKidMode ? 'Attach to new room' : 'Tether to New Chat'}
                      </span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {availableCanvases.filter(c => !c.chatId).map((canvas) => (
                        <button
                          key={canvas.id}
                          id={`tether-canvas-btn-${canvas.id}`}
                          type="button"
                          onClick={() => {
                            onTetherCanvasToNewChat(canvas);
                            setShowPlusMenu(false);
                          }}
                          className={`w-full text-left rounded-xl px-2 py-1.5 text-[10px] truncate block font-bold transition cursor-pointer ${
                            isKidMode ? 'text-pink-100 hover:bg-pink-800' : 'text-zinc-300 hover:bg-amber-600/20 hover:text-amber-400'
                          }`}
                        >
                          🔗 {canvas.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Chat Canvases: Add/Attach to current chat */}
                {availableCanvases.filter(c => c.chatId).length > 0 && (
                  <div className={`mt-2 pt-2 border-t ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
                    <div className="px-2 pb-1 select-none text-left">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isKidMode ? 'text-pink-200' : 'text-zinc-500'}`}>
                        {isKidMode ? 'Add other board' : 'Add Other Chat Canvas'}
                      </span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {availableCanvases.filter(c => c.chatId).map((canvas) => (
                        <button
                          key={canvas.id}
                          id={`attach-canvas-btn-${canvas.id}`}
                          type="button"
                          onClick={() => {
                            onAttachCanvas(canvas);
                            setShowPlusMenu(false);
                          }}
                          className={`w-full text-left rounded-xl px-2 py-1.5 text-[10px] truncate block font-bold transition cursor-pointer ${
                            isKidMode ? 'text-pink-100 hover:bg-pink-850' : 'text-zinc-300 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          📄 {canvas.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <textarea
            id="chat-textarea-input"
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedModel 
                ? isKidMode
                  ? `Ask your AI buddy "${selectedModel.split(':')[0]}" anything! 🐶🐾`
                  : `Message ${selectedModel}...` 
                : isKidMode
                  ? 'Select an AI buddy above to start! 🎒🐾'
                  : 'Select or download a model to begin messaging...'
            }
            disabled={!selectedModel}
            className={`flex-1 max-h-40 min-h-6 resize-none bg-transparent py-1 pr-24 text-sm placeholder-zinc-500 focus:outline-none disabled:opacity-40 leading-relaxed font-sans ${
              isKidMode ? 'text-pink-100' : 'text-zinc-100'
            }`}
          />

          {/* Action buttons inside the input bar */}
          <div className="absolute right-3.5 bottom-3 flex items-center gap-2">
            {!isGenerating && (
              <button
                id="improve-prompt-btn"
                type="button"
                onClick={handleImprovePrompt}
                disabled={!prompt.trim() || !selectedModel || isImproving}
                className={`rounded-xl border disabled:opacity-45 transition-all active:scale-95 duration-150 p-2.5 cursor-pointer disabled:cursor-not-allowed shadow-md flex items-center justify-center h-9 w-9 ${
                  isKidMode
                    ? 'bg-pink-700 border-pink-500 text-pink-200 hover:text-white hover:bg-pink-600'
                    : 'bg-zinc-900 border-zinc-800 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800'
                }`}
                title={isKidMode ? "✨ Make it Magic! ✨" : "Improve Prompt (AI Sparkle)"}
              >
                {isImproving ? (
                  <span className={`h-4 w-4 border-2 border-t-transparent rounded-full animate-spin ${isKidMode ? 'border-pink-200' : 'border-indigo-400'}`} />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            )}

            {isGenerating ? (
              <button
                id="stop-generation-btn"
                type="button"
                onClick={onStopGeneration}
                className="rounded-xl bg-rose-600 p-2.5 text-white hover:bg-rose-500 transition-colors active:scale-95 cursor-pointer shadow-md shadow-rose-950/20"
                title="Stop generation"
              >
                <Square className="h-4 w-4 fill-white" />
              </button>
            ) : (
              <button
                id="send-prompt-btn"
                type="submit"
                disabled={!prompt.trim() || !selectedModel || isImproving}
                className={`rounded-xl p-2.5 text-white disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors disabled:scale-100 active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-md ${
                  isKidMode
                    ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-950/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20'
                }`}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Input Footer Status Disclaimer */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-[10px] text-zinc-500 select-none">
          <span>
            {isKidMode 
              ? 'Ollama is your AI buddy! Always be kind and have fun! 🌟' 
              : 'Ollama can make mistakes. Verify important details.'}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isKidMode ? 'bg-pink-400' : 'bg-emerald-500'}`} />
            {isKidMode ? '🛡️ Safe Mode Active' : 'Local Sandbox'}
          </span>
        </div>
      </form>
    </div>
  );
}
