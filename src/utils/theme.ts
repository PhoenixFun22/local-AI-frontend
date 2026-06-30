export interface KidTheme {
  id: string;
  name: string;
  emoji: string;
  // Core colors
  rootBg: string;           // Root container bg class
  sidebarBg: string;        // Sidebar bg class
  sidebarBorder: string;    // Sidebar border class
  sidebarTabActive: string; // Sidebar active tab button classes
  sidebarTabInactive: string; // Sidebar inactive tab button classes
  sidebarHeaderBg: string;  // Sidebar header/footer bg
  headerBg: string;         // Top header bg class
  headerBorder: string;     // Top header border class
  mainBg: string;           // Main chat window bg
  cardBg: string;           // Normal card backgrounds
  cardBorder: string;       // Normal card borders
  activeItemBg: string;     // Active chat/canvas list item bg & border
  inactiveItemBg: string;   // Inactive item bg/hover classes
  buttonAccent: string;     // Accent solid buttons
  buttonAccentHover: string;// Accent solid button hover
  buttonSecondary: string;  // Border/ghost accent buttons
  textPrimary: string;      // Main text color
  textMuted: string;        // Muted/subtitle text color
  accentText: string;       // Highly visible contrasting highlight text color
  badgeBg: string;          // Badge/Status pill bg and text
  badgeBorder: string;      // Badge/Status border
  inputBg: string;          // Form input background
  inputBorder: string;      // Form input border
  bubbleUser: string;       // User message bubble classes
  bubbleAssistant: string;  // Assistant message bubble classes
}

export const KID_THEMES: Record<string, KidTheme> = {
  candy: {
    id: 'candy',
    name: 'Candy Wonderland',
    emoji: '🍭🍬',
    rootBg: 'bg-indigo-950 text-pink-100',
    sidebarBg: 'bg-indigo-900/90',
    sidebarBorder: 'border-fuchsia-800',
    sidebarTabActive: 'bg-pink-600 text-white border-pink-400',
    sidebarTabInactive: 'text-pink-200 hover:bg-pink-900/40 hover:text-white',
    sidebarHeaderBg: 'bg-indigo-950/40 border-fuchsia-850',
    headerBg: 'bg-indigo-900/30 border-fuchsia-850',
    headerBorder: 'border-fuchsia-850',
    mainBg: 'bg-pink-950/10',
    cardBg: 'bg-fuchsia-950/40 border-fuchsia-800',
    cardBorder: 'border-fuchsia-800',
    activeItemBg: 'bg-pink-600/30 border-pink-400 text-white',
    inactiveItemBg: 'bg-indigo-950/20 border-fuchsia-900 hover:bg-indigo-950/40 hover:border-pink-500/40 text-pink-200',
    buttonAccent: 'bg-pink-600 border-pink-400 text-white hover:bg-pink-500 hover:border-pink-300',
    buttonAccentHover: 'hover:bg-pink-500 hover:border-pink-300',
    buttonSecondary: 'bg-fuchsia-900/50 border-fuchsia-700 hover:bg-fuchsia-850 text-pink-200 hover:text-white',
    textPrimary: 'text-white',
    textMuted: 'text-pink-200',
    accentText: 'text-yellow-300 font-bold',
    badgeBg: 'bg-pink-600 hover:bg-pink-500 text-white border-pink-400',
    badgeBorder: 'border-pink-500/30',
    inputBg: 'bg-indigo-950/80 border-fuchsia-800 focus:border-pink-400',
    inputBorder: 'border-fuchsia-800',
    bubbleUser: 'bg-pink-600 border-pink-400 text-white rounded-tr-none',
    bubbleAssistant: 'bg-indigo-900/95 border-fuchsia-800 text-white rounded-tl-none shadow-lg'
  },
  space: {
    id: 'space',
    name: 'Deep Space Explorer',
    emoji: '🚀🌌',
    rootBg: 'bg-slate-950 text-cyan-100',
    sidebarBg: 'bg-slate-900/90',
    sidebarBorder: 'border-cyan-800/80',
    sidebarTabActive: 'bg-blue-600 text-white border-cyan-400',
    sidebarTabInactive: 'text-cyan-300 hover:bg-blue-950/40 hover:text-white',
    sidebarHeaderBg: 'bg-slate-950/50 border-cyan-900',
    headerBg: 'bg-slate-900/30 border-cyan-900',
    headerBorder: 'border-cyan-900',
    mainBg: 'bg-blue-950/10',
    cardBg: 'bg-blue-950/40 border-cyan-800/60',
    cardBorder: 'border-cyan-800/60',
    activeItemBg: 'bg-blue-600/30 border-cyan-400 text-white',
    inactiveItemBg: 'bg-slate-950/20 border-cyan-950 hover:bg-slate-950/40 hover:border-cyan-500/40 text-cyan-300',
    buttonAccent: 'bg-blue-600 border-cyan-400 text-white hover:bg-blue-500 hover:border-cyan-300',
    buttonAccentHover: 'hover:bg-blue-500 hover:border-cyan-300',
    buttonSecondary: 'bg-cyan-950/50 border-cyan-700 hover:bg-cyan-900 text-cyan-200 hover:text-white',
    textPrimary: 'text-white',
    textMuted: 'text-cyan-200',
    accentText: 'text-amber-300 font-bold',
    badgeBg: 'bg-blue-600 hover:bg-blue-500 text-white border-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    inputBg: 'bg-slate-950/80 border-cyan-800 focus:border-cyan-400',
    inputBorder: 'border-cyan-800',
    bubbleUser: 'bg-blue-600 border-cyan-400 text-white rounded-tr-none',
    bubbleAssistant: 'bg-slate-900/95 border-cyan-800 text-white rounded-tl-none shadow-lg'
  },
  safari: {
    id: 'safari',
    name: 'Jungle Safari',
    emoji: '🦁🌿',
    rootBg: 'bg-emerald-950 text-emerald-100',
    sidebarBg: 'bg-emerald-900/90',
    sidebarBorder: 'border-yellow-700/80',
    sidebarTabActive: 'bg-emerald-600 text-white border-yellow-400',
    sidebarTabInactive: 'text-emerald-200 hover:bg-emerald-900/40 hover:text-white',
    sidebarHeaderBg: 'bg-emerald-950/50 border-yellow-900',
    headerBg: 'bg-emerald-900/30 border-yellow-900',
    headerBorder: 'border-yellow-900',
    mainBg: 'bg-emerald-950/10',
    cardBg: 'bg-emerald-900/30 border-yellow-800/60',
    cardBorder: 'border-yellow-800/60',
    activeItemBg: 'bg-emerald-600/30 border-yellow-400 text-white',
    inactiveItemBg: 'bg-emerald-950/20 border-yellow-950 hover:bg-emerald-950/40 hover:border-emerald-500/40 text-emerald-200',
    buttonAccent: 'bg-emerald-600 border-yellow-400 text-white hover:bg-emerald-500 hover:border-yellow-300',
    buttonAccentHover: 'hover:bg-emerald-500 hover:border-yellow-300',
    buttonSecondary: 'bg-emerald-900/50 border-emerald-700 hover:bg-emerald-850 text-emerald-200 hover:text-white',
    textPrimary: 'text-white',
    textMuted: 'text-emerald-200',
    accentText: 'text-yellow-300 font-bold',
    badgeBg: 'bg-emerald-600 hover:bg-emerald-500 text-white border-yellow-400',
    badgeBorder: 'border-yellow-500/30',
    inputBg: 'bg-emerald-950/80 border-yellow-800 focus:border-emerald-400',
    inputBorder: 'border-yellow-800',
    bubbleUser: 'bg-emerald-600 border-yellow-400 text-white rounded-tr-none',
    bubbleAssistant: 'bg-emerald-900/95 border-emerald-800 text-white rounded-tl-none shadow-lg'
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Magic',
    emoji: '🌈✨',
    rootBg: 'bg-violet-950 text-indigo-100',
    sidebarBg: 'bg-violet-900/90',
    sidebarBorder: 'border-orange-500',
    sidebarTabActive: 'bg-violet-600 text-white border-yellow-400',
    sidebarTabInactive: 'text-indigo-200 hover:bg-violet-900/40 hover:text-white',
    sidebarHeaderBg: 'bg-violet-950/50 border-orange-900',
    headerBg: 'bg-violet-900/30 border-orange-900',
    headerBorder: 'border-orange-900',
    mainBg: 'bg-indigo-950/10',
    cardBg: 'bg-violet-900/30 border-orange-700/60',
    cardBorder: 'border-orange-700/60',
    activeItemBg: 'bg-violet-600/30 border-yellow-400 text-white',
    inactiveItemBg: 'bg-violet-950/20 border-orange-950 hover:bg-violet-950/40 hover:border-yellow-500/40 text-indigo-200',
    buttonAccent: 'bg-violet-600 border-orange-400 text-white hover:bg-violet-500 hover:border-orange-300',
    buttonAccentHover: 'hover:bg-violet-500 hover:border-orange-300',
    buttonSecondary: 'bg-violet-900/50 border-violet-700 hover:bg-violet-850 text-indigo-200 hover:text-white',
    textPrimary: 'text-white',
    textMuted: 'text-indigo-200',
    accentText: 'text-yellow-300 font-bold',
    badgeBg: 'bg-violet-600 hover:bg-violet-500 text-white border-yellow-400',
    badgeBorder: 'border-orange-500/30',
    inputBg: 'bg-violet-950/80 border-orange-800 focus:border-yellow-400',
    inputBorder: 'border-orange-800',
    bubbleUser: 'bg-violet-600 border-orange-400 text-white rounded-tr-none',
    bubbleAssistant: 'bg-violet-900/95 border-indigo-950 text-white rounded-tl-none shadow-lg'
  }
};

export function getKidTheme(themeId?: string): KidTheme {
  if (!themeId || !KID_THEMES[themeId]) {
    return KID_THEMES.candy;
  }
  return KID_THEMES[themeId];
}
