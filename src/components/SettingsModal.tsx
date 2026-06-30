import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, AlertCircle, Download, Cpu, Info, Globe, ShieldAlert, Heart, Lock } from 'lucide-react';
import { testOllamaConnection, fetchOllamaModels, pullOllamaModel, POPULAR_MODELS } from '../utils/ollama';
import { OllamaModel } from '../types';
import { KID_THEMES, getKidTheme } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  demoMode: boolean;
  setDemoMode: (demo: boolean) => void;
  onRefreshModels: () => Promise<void>;
  models: OllamaModel[];
  loadedModels: string[];
  onUnloadModel: (modelName: string) => Promise<void>;
  memories: string;
  setMemories: (val: string) => void;
  systemPrompts: Record<string, string>;
  setSystemPrompts: (prompts: Record<string, string>) => void;
  
  // Safety filter & Age states
  isKidMode: boolean;
  isAdult: boolean;
  isAdultFilterEnabled: boolean;
  setIsAdultFilterEnabled: (val: boolean) => void;

  // Kids Style / Theme
  kidStyle?: string;
  setKidStyle?: (style: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  ollamaUrl,
  setOllamaUrl,
  demoMode,
  setDemoMode,
  onRefreshModels,
  models,
  loadedModels,
  onUnloadModel,
  memories,
  setMemories,
  systemPrompts,
  setSystemPrompts,
  isKidMode,
  isAdult,
  isAdultFilterEnabled,
  setIsAdultFilterEnabled,
  kidStyle = 'candy',
  setKidStyle,
}: SettingsModalProps) {
  const [urlInput, setUrlInput] = useState(ollamaUrl);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Model pulling states
  const [pullingModel, setPullingModel] = useState('');
  const [pullStatus, setPullStatus] = useState('');
  const [pullProgress, setPullProgress] = useState(0);
  const [pullError, setPullError] = useState('');
  const [pulling, setPulling] = useState(false);

  const [selectedPromptModel, setSelectedPromptModel] = useState<string>('');

  useEffect(() => {
    setUrlInput(ollamaUrl);
  }, [ollamaUrl, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (models.length > 0) {
        if (!selectedPromptModel || !models.some(m => m.name === selectedPromptModel)) {
          setSelectedPromptModel(models[0].name);
        }
      } else if (demoMode) {
        if (!selectedPromptModel) {
          setSelectedPromptModel('llama3');
        }
      }
    }
  }, [isOpen, models, demoMode, selectedPromptModel]);

  if (!isOpen) return null;

  const currentKidTheme = getKidTheme(kidStyle);

  const handleTestConnection = async (testUrl: string) => {
    setTesting(true);
    setConnectionStatus('idle');
    setErrorMessage('');
    
    const isConnected = await testOllamaConnection(testUrl);
    
    setTesting(false);
    if (isConnected) {
      setConnectionStatus('success');
      setOllamaUrl(testUrl);
      localStorage.setItem('ollama_url', testUrl);
      onRefreshModels();
    } else {
      setConnectionStatus('error');
      setErrorMessage(
        isKidMode 
          ? "Oh no! We couldn't connect to Ollama. Make sure the helper app is turned on!" 
          : 'Could not connect to Ollama. Make sure Ollama is running and OLLAMA_ORIGINS="*" is set.'
      );
    }
  };

  const handleSaveUrl = () => {
    handleTestConnection(urlInput);
  };

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim()) return;
    setPulling(true);
    setPullError('');
    setPullStatus(isKidMode ? 'Getting your new brain ready...' : 'Initializing pull...');
    setPullProgress(0);
    
    try {
      await pullOllamaModel(ollamaUrl, modelName, (status, progress) => {
        setPullStatus(isKidMode ? `Downloading... ${progress}%` : status);
        setPullProgress(progress);
      });
      setPullStatus(isKidMode ? 'Awesome! Brain downloaded successfully! 🎉' : 'Successfully downloaded model!');
      setPullProgress(100);
      onRefreshModels();
    } catch (err: any) {
      setPullError(err.message || 'Failed to pull model');
      setPullStatus(isKidMode ? 'Oops! Download failed.' : 'Failed');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div 
      id="settings-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div 
        id="settings-modal" 
        className={`relative w-full max-w-2xl rounded-3xl border-2 shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ${
          isKidMode 
            ? `${currentKidTheme.sidebarBorder} ${currentKidTheme.sidebarBg} ${currentKidTheme.rootBg} p-6` 
            : 'border-zinc-800 bg-zinc-950 text-zinc-100 p-6'
        }`}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${isKidMode ? currentKidTheme.sidebarBorder : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2">
            {isKidMode ? (
              <>
                <span className="text-2xl">🛠️🎈</span>
                <h2 className="text-xl font-bold tracking-tight text-white">My Control Panel</h2>
              </>
            ) : (
              <>
                <Cpu className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xl font-semibold tracking-tight">Ollama Configuration</h2>
              </>
            )}
          </div>
          <button 
            id="close-settings"
            onClick={onClose}
            className={`rounded-xl p-1.5 transition ${
              isKidMode 
                ? 'bg-black/30 hover:bg-black/50 text-white' 
                : 'hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          
          {/* Adult Only Toggle */}
          {isAdult && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-4 flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="h-4 w-4" /> Kid-Safety Content Filter
                </h4>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Turn on content safety checks on AI responses to block inappropriate, violent, or cyber-attack related results.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdultFilterEnabled(!isAdultFilterEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  isAdultFilterEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    isAdultFilterEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Kid-Friendly Styles Selection & Hardlocked Memory (Kids Mode only) */}
          {isKidMode && (
            <>
              {/* Styles Selection */}
              <div id="kids-styles-picker" className={`rounded-xl border p-4 space-y-3 ${currentKidTheme.cardBorder} ${currentKidTheme.cardBg}`}>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>✨ App Styles ✨</span>
                </h3>
                <p className="text-[11px] text-zinc-300 leading-normal">
                  Pick a magical look for your playground! Each style has bright, fun colors!
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(KID_THEMES).map((theme) => {
                    const isActive = kidStyle === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setKidStyle?.(theme.id)}
                        className={`flex flex-col items-center gap-2 rounded-2xl p-4 border-2 text-center transition-all duration-300 active:scale-95 ${
                          isActive
                            ? 'border-yellow-400 bg-white/25 text-white scale-[1.02] shadow-lg shadow-yellow-500/20'
                            : 'border-white/10 bg-black/25 text-zinc-300 hover:border-white/30 hover:bg-black/35'
                        }`}
                      >
                        <span className="text-3xl animate-bounce [animation-duration:3s]">{theme.emoji}</span>
                        <span className="text-xs font-bold tracking-tight text-white">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hardlocked Kid Safety Memory Card */}
              <div className={`rounded-2xl border p-4 text-xs leading-relaxed flex gap-3 ${currentKidTheme.cardBorder} bg-black/30`}>
                <span className="text-2xl mt-0.5 shrink-0">🔒🐾</span>
                <div className="space-y-1">
                  <span className="font-bold text-white block">Special Safety Memory</span>
                  <p className="text-[11px] text-zinc-300 leading-normal">
                    Our special safety guard is always active to make sure responses are friendly:
                  </p>
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 font-medium italic text-yellow-200 text-[11px] my-2">
                    "The user is a young child. Please treat them like one, and make your responses understandable."
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    This safety guard is hardlocked and cannot be turned off.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Complicated Ollama & Connection Settings - Hidden for kids */}
          {!isKidMode && (
            <>


              {/* Connection Settings */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-zinc-300">
                  Ollama API Endpoint
                </h3>
                <div className="flex gap-2">
                  <input
                    id="ollama-url-input"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={demoMode}
                    className="flex-1 rounded-xl border px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 disabled:opacity-40 border-zinc-800 bg-zinc-900 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="http://localhost:11434"
                  />
                  <button
                    id="save-ollama-url-btn"
                    onClick={handleSaveUrl}
                    disabled={testing || demoMode}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40 transition duration-200 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Connect'}
                  </button>
                </div>

                {/* Connection Feedback */}
                {!demoMode && (
                  <div className="text-xs">
                    {connectionStatus === 'success' && (
                      <p className="text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Connected successfully! Found {models.length} installed model(s).
                      </p>
                    )}
                    {connectionStatus === 'error' && (
                      <div className="p-3 rounded-xl border space-y-1 bg-rose-500/10 border-rose-500/20 text-rose-400">
                        <p className="flex items-center gap-1 font-bold"><AlertCircle className="h-3.5 w-3.5" /> Connection Failed</p>
                        <p className="opacity-90">{errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Memory Management (Loaded Models) */}
              {loadedModels.length > 0 && (
                <div className="rounded-xl border p-4 space-y-3 border-zinc-850 bg-zinc-900/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-zinc-300">
                      Models Loaded in RAM
                    </h3>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded tracking-wider animate-pulse">
                      ACTIVE IN MEMORY
                    </span>
                  </div>
                  <div className="space-y-2">
                    {loadedModels.map((m) => (
                      <div key={m} className="flex items-center justify-between rounded-xl border border-zinc-850 bg-zinc-950 p-3">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-zinc-100">{m}</span>
                        </div>
                        <button
                          id={`settings-unload-btn-${m}`}
                          onClick={() => onUnloadModel(m)}
                          className="rounded-xl bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 px-3 py-1.5 text-xs text-rose-400 hover:text-white transition font-bold"
                        >
                          Unload Model
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Puller */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-zinc-300">
                    Pull Model from Ollama Registry
                  </h3>
                </div>
                
                <div className="flex gap-2">
                  <input
                    id="pull-model-input"
                    type="text"
                    placeholder="e.g. llama3, mistral, phi3"
                    value={pullingModel}
                    onChange={(e) => setPullingModel(e.target.value)}
                    disabled={demoMode || pulling}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 focus:border-indigo-500 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 disabled:opacity-40"
                  />
                  <button
                    id="pull-model-btn"
                    onClick={() => handlePullModel(pullingModel)}
                    disabled={demoMode || pulling || !pullingModel.trim()}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-white disabled:opacity-40 transition duration-200 bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
                  >
                    {pulling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Pull
                  </button>
                </div>

                {/* Pulling Progress */}
                {pullStatus && (
                  <div className="border border-zinc-850 bg-zinc-900/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-bold truncate max-w-[70%]">{pullStatus}</span>
                      <span className="font-mono text-zinc-400">{pullProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300 bg-indigo-500"
                        style={{ width: `${pullProgress}%` }}
                      ></div>
                    </div>
                    {pullError && <p className="text-rose-400 text-xs mt-1">{pullError}</p>}
                  </div>
                )}

                {/* Popular recommendation items */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500">
                    Recommended Models
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {POPULAR_MODELS.map((m) => (
                      <div 
                        key={m.name} 
                        className="flex items-center justify-between rounded-xl border border-zinc-850 bg-zinc-900/20 hover:bg-zinc-900/60 p-2.5 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-200 truncate">{m.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate leading-normal">{m.desc}</p>
                        </div>
                        <button
                          id={`pull-recommend-${m.name}`}
                          disabled={demoMode || pulling}
                          onClick={() => {
                            setPullingModel(m.name);
                            handlePullModel(m.name);
                          }}
                          className="rounded-xl px-2 py-1 text-[10px] font-bold transition disabled:opacity-30 bg-zinc-850 hover:bg-indigo-600 hover:text-white text-zinc-400"
                        >
                          {m.size}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* User Memories & Custom System Prompts */}
          <div className={`rounded-xl border p-4 space-y-4 ${isKidMode ? `${currentKidTheme.cardBorder} ${currentKidTheme.cardBg}` : 'border-zinc-850 bg-zinc-900/40'}`}>
            <h3 className={`font-bold text-sm ${isKidMode ? 'text-white' : 'text-zinc-200'}`}>
              {isKidMode ? 'About Me & My Interests 🎨' : 'Personalization & Memories'}
            </h3>
            
            {/* Global Memories Editor */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="settings-memories-editor" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {isKidMode ? 'Things About Me 🦄 (AI remembers this!)' : 'User Memories (Global)'}
              </label>
              <p className="text-[10px] text-zinc-500 leading-normal">
                {isKidMode 
                  ? 'Tell the AI what you like (dinosaurs, painting, games)! It will remember this in your chat rooms.'
                  : "Tell the model about yourself, example: The user's name is (your name)."}
              </p>
              <textarea
                id="settings-memories-editor"
                value={memories}
                onChange={(e) => setMemories(e.target.value)}
                placeholder={isKidMode ? "e.g., I love reading adventure books and my favorite animal is a golden retriever! 🐾" : "Tell the model about yourself, example: The user's name is (your name)."}
                className={`w-full h-24 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none font-sans resize-none ${
                  isKidMode ? `${currentKidTheme.inputBg} border-2 ${currentKidTheme.sidebarBorder}` : 'bg-zinc-950 border border-zinc-850 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Model-specific System Prompt Editor - Hidden for kids */}
            {!isKidMode && (
              <div className="space-y-1.5 text-left pt-3 border-t border-zinc-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Model System Prompts
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500">Edit for:</span>
                    <select
                      id="system-prompt-model-select"
                      value={selectedPromptModel}
                      onChange={(e) => setSelectedPromptModel(e.target.value)}
                      className="border rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none bg-zinc-950 border-zinc-800"
                    >
                      {models.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                      {models.length === 0 && (
                        <>
                          <option value="llama3">llama3</option>
                          <option value="mistral">mistral</option>
                          <option value="phi3">phi3</option>
                          <option value="gemma2">gemma2</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal text-left">
                  Custom rules or personas specific to this model.
                </p>
                <textarea
                  id="settings-system-prompt-editor"
                  value={systemPrompts[selectedPromptModel] || ''}
                  onChange={(e) => {
                    setSystemPrompts({
                      ...systemPrompts,
                      [selectedPromptModel]: e.target.value
                    });
                  }}
                  placeholder="e.g., You are an expert backend coder..."
                  className="w-full h-24 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none font-sans resize-none bg-zinc-950 border border-zinc-850 focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className={`rounded-xl border p-4 text-xs leading-relaxed flex gap-2.5 ${
            isKidMode 
              ? `${currentKidTheme.cardBg} ${currentKidTheme.cardBorder} text-zinc-200` 
              : 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300'
          }`}>
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">{isKidMode ? 'Safe & Private Playground 🛡' : 'Privacy First AI'}</span>
              {isKidMode 
                ? 'Your AI buddy thinks completely inside your computer! None of your secrets or stories are ever sent to the internet.'
                : 'Ollama processes your data entirely on your local hardware. No prompts or generation histories are ever sent to external cloud APIs.'}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`border-t pt-4 flex justify-end ${isKidMode ? currentKidTheme.sidebarBorder : 'border-zinc-800'}`}>
          <button
            id="settings-done-btn"
            onClick={onClose}
            className={`rounded-xl px-5 py-2 text-sm font-bold transition duration-200 ${
              isKidMode 
                ? `${currentKidTheme.buttonAccent} ${currentKidTheme.buttonAccentHover}` 
                : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            {isKidMode ? 'All Done! ⭐' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
}
