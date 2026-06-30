import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, AlertCircle, Download, Cpu, Info, Globe } from 'lucide-react';
import { testOllamaConnection, fetchOllamaModels, pullOllamaModel, POPULAR_MODELS } from '../utils/ollama';
import { OllamaModel } from '../types';

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
      setErrorMessage('Could not connect to Ollama. Make sure Ollama is running and OLLAMA_ORIGINS="*" is set.');
    }
  };

  const handleSaveUrl = () => {
    handleTestConnection(urlInput);
  };

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim()) return;
    setPulling(true);
    setPullError('');
    setPullStatus('Initializing pull...');
    setPullProgress(0);
    
    try {
      await pullOllamaModel(ollamaUrl, modelName, (status, progress) => {
        setPullStatus(status);
        setPullProgress(progress);
      });
      setPullStatus('Successfully downloaded model!');
      setPullProgress(100);
      onRefreshModels();
    } catch (err: any) {
      setPullError(err.message || 'Failed to pull model');
      setPullStatus('Failed');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div id="settings-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div id="settings-modal" className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-semibold tracking-tight">Ollama Configuration</h2>
          </div>
          <button 
            id="close-settings"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-800 transition text-zinc-400 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          
          {/* Mode Switcher */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <h3 className="font-medium text-sm text-zinc-300">Connection Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="mode-local-btn"
                onClick={() => setDemoMode(false)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border text-left transition ${
                  !demoMode 
                    ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Local Ollama
                </div>
                <span className="text-[10px] text-center opacity-80">Connects directly to http://localhost:11434</span>
              </button>

              <button
                id="mode-demo-btn"
                onClick={() => setDemoMode(true)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border text-left transition ${
                  demoMode 
                    ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Check className="h-3.5 w-3.5" />
                  Simulated Demo
                </div>
                <span className="text-[10px] text-center opacity-80">Test UI immediately with high-speed virtual models</span>
              </button>
            </div>
          </div>

          {/* Connection Settings */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-zinc-300">Ollama API Endpoint</h3>
            <div className="flex gap-2">
              <input
                id="ollama-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={demoMode}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                placeholder="http://localhost:11434"
              />
              <button
                id="save-ollama-url-btn"
                onClick={handleSaveUrl}
                disabled={testing || demoMode}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition"
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
                  <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg border border-rose-500/20 space-y-1">
                    <p className="flex items-center gap-1 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Connection Failed</p>
                    <p className="opacity-90">{errorMessage}</p>
                    <div className="pt-2 mt-2 border-t border-rose-500/10 text-[11px] leading-relaxed">
                      <span className="font-semibold block mb-1">To run Ollama on your local computer:</span>
                      1. Open your terminal and run <code className="bg-zinc-950 px-1 py-0.5 rounded text-white">ollama run llama3</code><br/>
                      2. For web access (CORS), enable origins by launching with:<br/>
                      <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-white block mt-1 select-all">OLLAMA_ORIGINS="*" ollama serve</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Memory Management (Loaded Models) */}
          {loadedModels.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-zinc-300">Models Loaded in RAM</h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded tracking-wider animate-pulse">ACTIVE IN MEMORY</span>
              </div>
              <div className="space-y-2">
                {loadedModels.map((m) => (
                  <div key={m} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-100">{m}</span>
                    </div>
                    <button
                      id={`settings-unload-btn-${m}`}
                      onClick={() => onUnloadModel(m)}
                      className="rounded-lg bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 px-3 py-1.5 text-xs text-rose-400 hover:text-white transition font-semibold"
                    >
                      Unload Model
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Puller (Disabled in Demo Mode) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-zinc-300">Pull Model from Ollama Registry</h3>
              <span className="text-xs text-zinc-500 font-mono">Requires Ollama Connection</span>
            </div>
            
            <div className="flex gap-2">
              <input
                id="pull-model-input"
                type="text"
                placeholder="e.g. llama3, mistral, phi3"
                value={pullingModel}
                onChange={(e) => setPullingModel(e.target.value)}
                disabled={demoMode || pulling}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              />
              <button
                id="pull-model-btn"
                onClick={() => handlePullModel(pullingModel)}
                disabled={demoMode || pulling || !pullingModel.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition"
              >
                {pulling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Pull
              </button>
            </div>

            {/* Pulling Progress */}
            {pullStatus && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium truncate max-w-[70%]">{pullStatus}</span>
                  <span className="font-mono text-zinc-400">{pullProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${pullProgress}%` }}
                  ></div>
                </div>
                {pullError && <p className="text-rose-400 text-xs mt-1">{pullError}</p>}
              </div>
            )}

            {/* Popular recommendation items */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Recommended Models</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POPULAR_MODELS.map((m) => (
                  <div 
                    key={m.name} 
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/20 p-2.5 hover:bg-zinc-900/60 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{m.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{m.desc}</p>
                    </div>
                    <button
                      id={`pull-recommend-${m.name}`}
                      disabled={demoMode || pulling}
                      onClick={() => {
                        setPullingModel(m.name);
                        handlePullModel(m.name);
                      }}
                      className="rounded-md bg-zinc-800 hover:bg-indigo-600 hover:text-white px-2 py-1 text-[10px] text-zinc-400 font-medium transition disabled:opacity-30"
                    >
                      {m.size}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Memories & Custom System Prompts */}
          <div className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-4 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200">Personalization & System Prompts</h3>
            
            {/* Global Memories Editor */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="settings-memories-editor" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                User Memories (Global)
              </label>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Tell the AI about yourself (interests, job, preferred coding styles). These facts will be automatically injected at the start of personalization-enabled chats.
              </p>
              <textarea
                id="settings-memories-editor"
                value={memories}
                onChange={(e) => setMemories(e.target.value)}
                placeholder="e.g., My name is Alex. I am a frontend developer who likes clean, functional React code with Tailwind CSS and TypeScript."
                className="w-full h-24 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans resize-none"
              />
            </div>

            {/* Model-specific System Prompt Editor */}
            <div className="space-y-1.5 text-left pt-3 border-t border-zinc-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Model System Prompts
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">Edit for:</span>
                  <select
                    id="system-prompt-model-select"
                    value={selectedPromptModel}
                    onChange={(e) => setSelectedPromptModel(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
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
              <p className="text-[10px] text-zinc-500 leading-normal">
                Custom rules or personas specific to this model. Injected before memories.
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
                placeholder="e.g., You are an expert backend coder. Ensure your code handles edge cases, timeouts, and inputs safely."
                className="w-full h-24 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans resize-none"
              />
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/20 p-4 text-xs text-indigo-300 leading-relaxed flex gap-2.5">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Privacy First AI</span>
              Ollama processes your data entirely on your local hardware. No prompts or generation histories are ever sent to external cloud APIs, guaranteeing total confidentiality and latency benefits.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-4 flex justify-end">
          <button
            id="settings-done-btn"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium hover:bg-zinc-700 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
