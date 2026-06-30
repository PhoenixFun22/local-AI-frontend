import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Cpu, Sparkles, Plus, AlertCircle, Menu, Settings } from 'lucide-react';
import { OllamaModel, OllamaStatus } from '../types';
import { POPULAR_MODELS } from '../utils/ollama';

interface ModelSelectorProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  onOpenSettings: () => void;
  status: OllamaStatus;
  demoMode: boolean;
  loadedModels: string[];
  onUnloadModel: (modelName: string) => Promise<void>;
  
  // Custom kid props
  isKidMode?: boolean;
}

export default function ModelSelector({
  sidebarOpen,
  onToggleSidebar,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  status,
  demoMode,
  loadedModels,
  onUnloadModel,
  isKidMode = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModels = demoMode 
    ? POPULAR_MODELS.map(m => ({ name: m.name, model: m.name, size: 0 })) 
    : models;

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      {/* Sidebar Trigger (Hamburger Menu) when collapsed */}
      {!sidebarOpen && (
        <button
          id="expand-sidebar-btn-top"
          onClick={onToggleSidebar}
          className={`rounded-xl p-2 border transition cursor-pointer flex items-center justify-center shrink-0 ${
            isKidMode 
              ? 'bg-pink-600 border-pink-500 hover:bg-pink-500 text-white shadow-pink-900/30 shadow-lg' 
              : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-105'
          }`}
          title="Expand Sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* Model Selection Dropdown Container */}
      <div className="relative">
        <button
          id="model-selector-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition shadow-md cursor-pointer focus:outline-none ${
            isKidMode
              ? 'border-pink-500 bg-pink-600 hover:bg-pink-500 text-white'
              : 'border-zinc-800 bg-zinc-950/80 text-zinc-200 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isKidMode ? (
              <span className="text-sm">🧠</span>
            ) : demoMode ? (
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Cpu className={`h-3.5 w-3.5 ${status.connected ? 'text-indigo-400' : 'text-zinc-500'}`} />
            )}
            <span className="truncate max-w-[120px] sm:max-w-[200px]">
              {isKidMode 
                ? `Brain: ${selectedModel || 'No Brain Selected yet 🐾'}` 
                : selectedModel || (demoMode ? 'Select Demo Model' : 'No Model Selected')}
            </span>
            {demoMode && (
              <span className={`font-mono text-[9px] px-1 py-0.2 rounded shrink-0 ${
                isKidMode ? 'bg-pink-800 text-pink-200' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {isKidMode ? 'Safe' : 'Demo'}
              </span>
            )}
          </div>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''} ${isKidMode ? 'text-white' : 'text-zinc-400'}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            id="model-selector-dropdown-menu"
            className={`absolute left-0 mt-2 z-40 w-64 rounded-2xl border p-2 shadow-2xl animate-in fade-in duration-150 ${
              isKidMode 
                ? 'border-pink-850 bg-pink-900 text-white' 
                : 'border-zinc-800 bg-zinc-950 text-zinc-100'
            }`}
          >
            <div className={`px-2.5 py-1.5 border-b mb-1 ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isKidMode ? 'text-pink-200' : 'text-zinc-500'}`}>
                {isKidMode ? 'My AI Brain Buddies 🧠🐾' : demoMode ? 'Virtual Demo Models' : 'Installed Ollama Models'}
              </span>
            </div>

            <div className="max-h-[280px] overflow-y-auto space-y-0.5">
              {activeModels.length === 0 ? (
                <div className="px-2.5 py-3 text-center">
                  <p className="text-xs text-zinc-500 flex items-center justify-center gap-1 mb-2">
                    <AlertCircle className="h-3.5 w-3.5 text-zinc-600" />
                    No models installed
                  </p>
                  <button
                    id="pull-model-trigger-dropdown"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSettings();
                    }}
                    className={`w-full rounded-xl py-1.5 text-[10px] transition font-bold ${
                      isKidMode 
                        ? 'bg-pink-600 hover:bg-pink-500 text-white' 
                        : 'bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/25 text-indigo-400 hover:text-white'
                    }`}
                  >
                    {isKidMode ? 'Get an AI Brain Buddy!' : 'Open Model Manager'}
                  </button>
                </div>
              ) : (
                activeModels.map((m) => {
                  const isSelected = m.name === selectedModel;
                  const isLoaded = loadedModels.includes(m.name);
                  return (
                    <button
                      key={m.name}
                      id={`model-option-${m.name}`}
                      onClick={() => {
                        onSelectModel(m.name);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left rounded-xl px-2.5 py-2 text-xs font-bold flex items-center justify-between transition duration-150 ${
                        isSelected
                          ? isKidMode 
                            ? 'bg-pink-500 text-white shadow-inner' 
                            : 'bg-indigo-600 text-white'
                          : isKidMode
                            ? 'text-pink-100 hover:bg-pink-850 hover:text-white'
                            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 mr-1">
                        {isKidMode ? (
                          <span className="text-sm shrink-0">🐶</span>
                        ) : demoMode ? (
                          <Sparkles className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                        ) : (
                          <Cpu className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />
                        )}
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLoaded && (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold tracking-wide ${
                            isKidMode ? 'bg-pink-950 text-pink-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            RAM
                          </span>
                        )}
                        {isLoaded && (
                          <button
                            id={`unload-model-btn-${m.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnloadModel(m.name);
                            }}
                            className="text-[10px] bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white px-2 py-0.5 rounded transition font-bold animate-pulse"
                            title="Unload model from memory"
                          >
                            Unload
                          </button>
                        )}
                        {m.size > 0 && !isLoaded && (
                          <span className={`font-mono text-[9px] shrink-0 ${isSelected ? 'text-white/80' : 'text-pink-300'}`}>
                            {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {activeModels.length > 0 && (
              <div className={`mt-1 pt-1.5 border-t ${isKidMode ? 'border-pink-800' : 'border-zinc-900'}`}>
                <button
                  id="pull-more-models-dropdown"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[10px] transition font-bold ${
                    isKidMode 
                      ? 'bg-pink-950 hover:bg-pink-800 text-pink-300' 
                      : 'hover:bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Plus className={`h-3 w-3 ${isKidMode ? 'text-pink-300' : 'text-indigo-400'}`} />
                  {isKidMode ? '🎒 Get a new AI Brain Buddy!' : 'Install more models'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
