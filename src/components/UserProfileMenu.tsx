import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Shield, LogOut, Users, Trash2, X, ToggleLeft, ToggleRight, AlertTriangle, Sparkles, Baby, MessageSquare, Key, ChevronRight } from 'lucide-react';
import { decryptJSON, deriveKey } from '../utils/crypto';

interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  ageGroup?: string;
  tetheredParent?: string;
}

interface KidProfile {
  username: string;
  firstName: string;
  lastName: string;
  ageGroup: string;
  parentTetherFile: string;
  encryptedChats: string;
  childPassword?: string;
  chats?: any[];
}

interface UserProfileMenuProps {
  user: UserProfile;
  sessionToken: string;
  encryptionKey: string; // Passed from parent App to decrypt child details in RAM
  onSignOut: () => void;
  onRefreshAuthStatus?: () => void;
}

export default function UserProfileMenu({ user, sessionToken, encryptionKey, onSignOut, onRefreshAuthStatus }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showTetherModal, setShowTetherModal] = useState(false);
  
  // Admin Lists
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [disableSignups, setDisableSignups] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Tether Lists
  const [tetheredKids, setTetheredKids] = useState<KidProfile[]>([]);
  const [loadingTethers, setLoadingTethers] = useState(false);
  const [activeKidIndex, setActiveKidIndex] = useState<number | null>(null);
  const [activeChatIndex, setActiveChatIndex] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch admin directory if admin modal is opened
  useEffect(() => {
    if (showAdminModal && user.role === 'admin') {
      fetchAdminData();
    }
  }, [showAdminModal]);

  // Fetch children if tether modal is opened
  useEffect(() => {
    if (showTetherModal) {
      fetchTetheredKids();
    }
  }, [showTetherModal]);

  const fetchAdminData = async () => {
    setLoadingUsers(true);
    setModalError('');
    try {
      // 1. Fetch users list
      const usersRes = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      if (!usersRes.ok) {
        throw new Error('Failed to retrieve registered users list');
      }
      const usersData = await usersRes.json();
      setUsersList(usersData.users || []);

      // 2. Fetch global signup config
      const statusRes = await fetch('/api/auth/status');
      const statusData = await statusRes.json();
      setDisableSignups(statusData.disableSignups);
    } catch (err: any) {
      setModalError(err.message || 'Error loading administration panel data');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTetheredKids = async () => {
    setLoadingTethers(true);
    setModalError('');
    setActiveKidIndex(null);
    setActiveChatIndex(null);

    try {
      const res = await fetch('/api/parent/tethered-kids', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve tethered children accounts.');
      }

      const data = await res.json();
      const rawKids: KidProfile[] = data.kids || [];

      // Decrypt child details and chats in RAM using the parent's encryption key
      const decryptedKids = rawKids.map(kid => {
        try {
          if (kid.parentTetherFile && encryptionKey) {
            const parentTether = decryptJSON<{
              childUsername: string;
              childPassword: string;
              childFirstName: string;
              childLastName: string;
            }>(kid.parentTetherFile, encryptionKey);

            if (parentTether) {
              const childKey = deriveKey(parentTether.childFirstName, parentTether.childLastName, parentTether.childPassword);
              let childChats: any[] = [];
              if (kid.encryptedChats) {
                childChats = decryptJSON<any[]>(kid.encryptedChats, childKey) || [];
              }
              return {
                ...kid,
                childPassword: parentTether.childPassword,
                chats: childChats
              };
            }
          }
        } catch (err) {
          console.error('Failed to decrypt child credential details:', err);
        }
        return {
          ...kid,
          childPassword: '(Encrypted / Unknown)',
          chats: []
        };
      });

      setTetheredKids(decryptedKids);
    } catch (err: any) {
      setModalError(err.message || 'Could not load children accounts.');
    } finally {
      setLoadingTethers(false);
    }
  };

  const handleToggleSignups = async () => {
    try {
      const targetVal = !disableSignups;
      const res = await fetch('/api/admin/toggle-signups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ disableSignups: targetVal })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update signups setting');
      }

      setDisableSignups(targetVal);
      if (onRefreshAuthStatus) onRefreshAuthStatus();
    } catch (err: any) {
      setModalError(err.message || 'Could not toggle registration state.');
    }
  };

  const handleDeleteUser = async (targetUsername: string) => {
    if (targetUsername === user.username) {
      setModalError('For security, you cannot delete your own administrative account.');
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to permanently delete user "${targetUsername}"? All their encrypted chats, canvases, and memories will be lost forever.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ targetUsername })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete user account');
      }

      fetchAdminData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to delete user account.');
    }
  };

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  // Determine isAdult for kids management
  const isAdult = user.ageGroup === 'adult' || !user.ageGroup;

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        id="user-profile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-zinc-850/70 active:scale-95 transition rounded-full py-1.5 pl-1.5 pr-3 cursor-pointer text-zinc-100 border border-zinc-800"
      >
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold shadow-md ring-1 ring-zinc-700">
          {initials}
        </div>
        <div className="flex flex-col items-start text-left leading-none max-w-[80px]">
          <span className="text-[11px] font-bold truncate w-full">{user.firstName}</span>
          <span className="text-[9px] text-zinc-400 capitalize mt-0.5">{user.ageGroup || user.role}</span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150 text-left">
          <div className="px-3 py-2 border-b border-zinc-900 mb-1.5">
            <p className="text-xs font-bold text-zinc-200">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">@{user.username}</p>
          </div>

          <div className="space-y-0.5">
            {isAdult && (
              <button
                onClick={() => {
                  setShowTetherModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-pink-400 hover:text-pink-300 hover:bg-pink-950/25 active:bg-pink-950/40 transition cursor-pointer text-left"
              >
                <Baby className="h-4 w-4" />
                <span>Tethered Children 👧👦</span>
              </button>
            )}

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setShowAdminModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 active:bg-indigo-950/40 transition cursor-pointer text-left"
              >
                <Users className="h-4 w-4" />
                <span>Manage Workspace</span>
              </button>
            )}

            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 active:bg-rose-950/40 transition cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Tethered Children Modal */}
      {showTetherModal && createPortal(
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
            {/* Header design */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 mt-[3px]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-pink-950/50 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Baby className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Children's Safety Control & Chats</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Tethered young profiles and read-only decrypted conversation auditing</p>
                </div>
              </div>
              <button
                onClick={() => setShowTetherModal(false)}
                className="p-1.5 rounded-lg bg-zinc-950/40 border border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/80 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Kids List Left Rail */}
              <div className="w-1/3 border-r border-zinc-850 overflow-y-auto p-4 space-y-3 bg-zinc-950/20">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Registered Kids</p>

                {loadingTethers ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                    <span className="h-5 w-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px]">Finding children accounts...</span>
                  </div>
                ) : tetheredKids.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 border-dashed rounded-xl">
                    No children accounts are currently tethered to your parent profile.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tetheredKids.map((kid, idx) => (
                      <button
                        key={kid.username}
                        onClick={() => {
                          setActiveKidIndex(idx);
                          setActiveChatIndex(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border flex flex-col gap-1 transition ${
                          activeKidIndex === idx
                            ? 'bg-pink-950/25 border-pink-500/40'
                            : 'bg-zinc-950/30 border-zinc-850 hover:bg-zinc-850/30'
                        }`}
                      >
                        <span className="text-xs font-bold text-zinc-200">{kid.firstName} {kid.lastName}</span>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5 font-mono">
                          <span>@{kid.username}</span>
                          <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/10 rounded px-1 uppercase tracking-wider font-bold">Kid</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Center / Right Panels */}
              <div className="flex-1 flex overflow-hidden">
                {activeKidIndex === null ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                    <Baby className="h-10 w-10 text-zinc-600 mb-2.5" />
                    <p className="text-xs font-semibold">Select a Tethered Child Profile</p>
                    <p className="text-[10px] text-zinc-600 max-w-[280px] mt-1 leading-normal">
                      Auditing enables you to view passwords, retrieve details, and review complete chat room history.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Kid's Chats List */}
                    <div className="w-2/5 border-r border-zinc-850 overflow-y-auto p-4 space-y-4">
                      {/* Password Info */}
                      <div className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-3.5 space-y-2 text-left">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <Key className="h-3.5 w-3.5 text-pink-400" /> Account Passcode
                        </div>
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-bold text-pink-300 font-mono select-all">
                            {tetheredKids[activeKidIndex].childPassword}
                          </code>
                          <span className="text-[8px] text-zinc-500 leading-normal">Use this to log them in!</span>
                        </div>
                      </div>

                      {/* Chats */}
                      <div className="space-y-2 text-left">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Decrypted Chat Rooms</p>
                        {(!tetheredKids[activeKidIndex].chats || tetheredKids[activeKidIndex].chats!.length === 0) ? (
                          <div className="text-center py-10 text-zinc-500 text-[11px] border border-zinc-850 border-dashed rounded-xl">
                            No chats found in this child's vault.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {tetheredKids[activeKidIndex].chats!.map((chat, idx) => (
                              <button
                                key={chat.id}
                                onClick={() => setActiveChatIndex(idx)}
                                className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition ${
                                  activeChatIndex === idx
                                    ? 'bg-zinc-850 border-pink-500/30'
                                    : 'bg-zinc-950/20 border-zinc-900 hover:bg-zinc-850/20'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-semibold text-zinc-200 truncate">{chat.title || 'Untitled Conversation'}</p>
                                  <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">{chat.model || 'Unknown Model'}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chat Messages Auditer Viewer */}
                    <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/30 flex flex-col">
                      {activeChatIndex === null ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center">
                          <MessageSquare className="h-8 w-8 text-zinc-700 mb-2" />
                          <p className="text-xs font-semibold">Auditing Conversation</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Select a chat room on the left to read messages.</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-start text-left space-y-4">
                          <div className="border-b border-zinc-850 pb-3 mb-1">
                            <h4 className="text-xs font-bold text-zinc-200">
                              {tetheredKids[activeKidIndex].chats![activeChatIndex].title}
                            </h4>
                            <p className="text-[10px] text-pink-400 font-mono mt-0.5">
                              Model: {tetheredKids[activeKidIndex].chats![activeChatIndex].model}
                            </p>
                          </div>

                          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                            {tetheredKids[activeKidIndex].chats![activeChatIndex].messages.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="space-y-1">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                  m.role === 'user' ? 'text-indigo-400' : 'text-pink-400'
                                }`}>
                                  {m.role === 'user' ? 'Child' : 'AI Assistant'}
                                </span>
                                <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[95%] whitespace-pre-wrap ${
                                  m.role === 'user' ? 'bg-indigo-950/30 text-indigo-100 border border-indigo-900/40' : 'bg-pink-950/15 text-zinc-100 border border-pink-950/35'
                                }`}>
                                  {m.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Dashboard Modal */}
      {showAdminModal && createPortal(
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Header design */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 mt-[3px]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Workspace Management</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Administrate user profiles, restrictions, and files</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-lg bg-zinc-950/40 border border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/80 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-left">
              {modalError && (
                <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Registration Toggle Setting */}
              <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4">
                <div className="space-y-0.5 max-w-[75%]">
                  <p className="text-xs font-semibold text-zinc-200">Disable New Signups</p>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    When active, new users are blocked from registering. Existing users can still unlock and access their workspaces.
                  </p>
                </div>
                <button
                  onClick={handleToggleSignups}
                  className="text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {disableSignups ? (
                    <ToggleRight className="h-9 w-9 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="h-9 w-9 text-zinc-600" />
                  )}
                </button>
              </div>

              {/* User Directory list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 px-1">
                  <Users className="h-3.5 w-3.5 text-indigo-400" /> User Directory
                </p>

                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 border border-zinc-850 border-dashed rounded-2xl">
                    <span className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-zinc-500">Querying directory tables...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="text-center py-10 border border-zinc-850 border-dashed rounded-2xl text-zinc-500 text-xs">
                    No users registered in storage.
                  </div>
                ) : (
                  <div className="border border-zinc-850 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-850 bg-zinc-950/10">
                    {usersList.map((usr) => (
                      <div key={usr.username} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-850/20 transition">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {usr.firstName.charAt(0)}{usr.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-200">{usr.firstName} {usr.lastName}</span>
                              {usr.role === 'admin' && (
                                <span className="bg-indigo-950/50 text-[8px] text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                  Admin
                                </span>
                              )}
                              {usr.ageGroup && (
                                <span className="bg-pink-950/50 text-[8px] text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                  {usr.ageGroup}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">@{usr.username}</span>
                          </div>
                        </div>

                        {usr.username !== user.username ? (
                          <button
                            onClick={() => handleDeleteUser(usr.username)}
                            className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-850 text-rose-500 hover:text-rose-400 hover:bg-rose-950/10 hover:border-rose-500/20 transition cursor-pointer active:scale-95"
                            title={`Delete account @${usr.username}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-medium italic pr-2">You</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Security note */}
            <div className="bg-zinc-950/30 border-t border-zinc-850 p-4 text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>Even as Admin, you cannot read or decrypt other users' personal files on disk.</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
