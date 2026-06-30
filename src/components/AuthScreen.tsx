import React, { useState, useEffect } from 'react';
import { Lock, User, Key, Shield, ArrowRight, Sparkles, LogIn, UserPlus, ArrowLeft, Baby, Smile, Compass } from 'lucide-react';
import { deriveKey, encryptJSON, decryptJSON } from '../utils/crypto';

interface AuthScreenProps {
  onAuthSuccess: (authData: {
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    sessionToken: string;
    encryptionKey: string;
    ageGroup?: string;
    tetheredParent?: string;
  }) => Promise<void> | void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [disableSignups, setDisableSignups] = useState<boolean>(false);

  // Experience Tailoring States
  const [showTailor, setShowTailor] = useState<boolean>(false);
  const [tailorStep, setTailorStep] = useState<'select' | 'kid_tether'>('select');
  const [parentUsername, setParentUsername] = useState<string>('');
  const [parentPassword, setParentPassword] = useState<string>('');
  const [childPassword, setChildPassword] = useState<string>('');

  useEffect(() => {
    // Check if admin is registered and retrieve signup status
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setHasAdmin(data.hasAdmin);
          setDisableSignups(data.disableSignups);
          if (data.hasAdmin === false) {
            setIsLoginMode(false); // Force signup mode if no admin exists
          }
        } else {
          setHasAdmin(true); // Fallback to login mode if backend call failed
        }
      } catch (err) {
        console.error('Failed to contact security backend:', err);
        setHasAdmin(false); // Fallback to signup so user can at least create local account
      }
    };
    checkStatus();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username and passcode are required.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    if (isLoginMode) {
      // --- LOGIN FLOW ---
      setLoading(true);
      try {
        // 1. Fetch user profile (firstName, lastName, role, authFile) from server
        const profileRes = await fetch('/api/auth/get-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername })
        });

        if (!profileRes.ok) {
          const errData = await profileRes.json();
          throw new Error(errData.error || 'User not found');
        }

        const profile = await profileRes.json();

        // 2. Derive key in RAM from firstName, lastName, and entered password
        const derivedKey = deriveKey(profile.firstName, profile.lastName, password);

        // 3. Try to decrypt auth.enc using the derived key
        let verifiedSignature;
        try {
          verifiedSignature = decryptJSON<{ username: string; status: string }>(profile.authFile, derivedKey);
        } catch (decErr) {
          throw new Error('Incorrect passcode. Decryption failed.');
        }

        if (!verifiedSignature || verifiedSignature.username !== cleanUsername || verifiedSignature.status !== 'verified') {
          throw new Error('Incorrect passcode or credentials mismatch.');
        }

        // 4. Send verification proof to server to establish a session
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            verifiedSignature
          })
        });

        if (!loginRes.ok) {
          const errData = await loginRes.json();
          throw new Error(errData.error || 'Login session establishment failed');
        }

        const session = await loginRes.json();

        // 5. Trigger success callback - passing session info and derived key in RAM
        await onAuthSuccess({
          username: session.username,
          firstName: session.firstName,
          lastName: session.lastName,
          role: session.role,
          sessionToken: session.sessionToken,
          encryptionKey: derivedKey,
          ageGroup: session.ageGroup,
          tetheredParent: session.tetheredParent
        });

      } catch (err: any) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // --- SIGNUP FORM SUBMISSION ---
      if (!firstName.trim() || !lastName.trim()) {
        setError('First name and last name are required for key derivation.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passcodes do not match.');
        return;
      }
      if (password.length < 4) {
        setError('Passcode must be at least 4 characters for basic cryptographic strength.');
        return;
      }

      const isAdminSignup = hasAdmin === false;
      if (isAdminSignup) {
        // Admins skip tailoring
        executeSignup('adult', null, null);
      } else {
        // Regular signup triggers tailoring!
        setChildPassword(password); // Prefill kid's passcode with what they entered
        setShowTailor(true);
        setTailorStep('select');
      }
    }
  };

  const executeSignup = async (
    ageGroup: 'kid' | 'teen' | 'adult',
    tetheredParentUsername: string | null,
    parentTetherEncrypted: string | null
  ) => {
    setLoading(true);
    setError('');
    const cleanUsername = username.trim().toLowerCase();
    const finalPasscode = ageGroup === 'kid' ? childPassword : password;

    try {
      const role = hasAdmin === false ? 'admin' : 'user';

      // 1. Derive encryption key in RAM
      const derivedKey = deriveKey(firstName, lastName, finalPasscode);

      // 2. Encrypt the verification proof (signature)
      const authFile = encryptJSON({ username: cleanUsername, status: 'verified' }, derivedKey);

      // 3. Encrypt initial empty templates for chats, canvases, and default settings
      const defaultSettings = {
        memories: '',
        systemPrompts: {},
        demoMode: true,
        isAdultFilterEnabled: ageGroup === 'kid' || ageGroup === 'teen'
      };
      const encryptedChats = encryptJSON([], derivedKey);
      const encryptedCanvases = encryptJSON([], derivedKey);
      const encryptedSettings = encryptJSON(defaultSettings, derivedKey);

      // 4. Send registration payload to the server
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          authFile,
          encryptedChats,
          encryptedCanvases,
          encryptedSettings,
          ageGroup,
          tetheredParent: tetheredParentUsername,
          parentTetherFile: parentTetherEncrypted
        })
      });

      if (!signupRes.ok) {
        const errData = await signupRes.json();
        throw new Error(errData.error || 'Signup failed');
      }

      const session = await signupRes.json();

      // 5. Trigger success callback
      await onAuthSuccess({
        username: session.username,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
        sessionToken: session.sessionToken,
        encryptionKey: derivedKey,
        ageGroup: session.ageGroup,
        tetheredParent: session.tetheredParent
      });

    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      setShowTailor(false); // Go back to fix if failed
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyParentTether = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!parentUsername.trim() || !parentPassword.trim() || !childPassword.trim()) {
      setError('Parent details and child passcode are required.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch parent details to verify existence and get encrypted authFile
      const verifyRes = await fetch('/api/auth/verify-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUsername: parentUsername.trim().toLowerCase() })
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        throw new Error(errData.error || 'Parent user not found.');
      }

      const parentProfile = await verifyRes.json();

      // 2. Derive parent's key locally to verify password
      const parentKey = deriveKey(parentProfile.firstName, parentProfile.lastName, parentPassword);

      // 3. Try to decrypt parent's authFile to verify correct parent passcode
      let verifiedParentSignature;
      try {
        verifiedParentSignature = decryptJSON<{ username: string; status: string }>(parentProfile.authFile, parentKey);
      } catch (decErr) {
        throw new Error('Incorrect parent passcode.');
      }

      if (!verifiedParentSignature || verifiedParentSignature.username !== parentUsername.trim().toLowerCase()) {
        throw new Error('Verification of parent passcode failed.');
      }

      // Parent is verified! Now encrypt the kid credentials using the parent's derived key
      const parentTetherFileEncrypted = encryptJSON({
        childUsername: username.trim().toLowerCase(),
        childPassword: childPassword,
        childFirstName: firstName.trim(),
        childLastName: lastName.trim()
      }, parentKey);

      // 4. Complete kid signup with tether details
      await executeSignup('kid', parentUsername.trim().toLowerCase(), parentTetherFileEncrypted);

    } catch (err: any) {
      setError(err.message || 'Parent tether verification failed.');
    } finally {
      setLoading(false);
    }
  };

  if (hasAdmin === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-zinc-400 font-medium font-sans">Connecting to security vault...</span>
        </div>
      </div>
    );
  }

  const isAdminSignup = hasAdmin === false;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        {showTailor ? (
          /* --- TAILOR EXPERIENCE FLOW --- */
          <div className="space-y-6">
            {tailorStep === 'select' ? (
              <>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner mx-auto mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">Let's tailor your experience!</h2>
                  <p className="text-xs text-zinc-400 mt-1">Choose the workspace mode that is right for you.</p>
                </div>

                {error && (
                  <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-left">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Option 1: Kid */}
                  <button
                    onClick={() => setTailorStep('kid_tether')}
                    className="w-full text-left p-4 bg-zinc-950 border border-zinc-850 hover:border-pink-500 hover:bg-pink-950/10 rounded-2xl flex items-center gap-4 group transition-all duration-200"
                  >
                    <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-all">
                      <Baby className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-pink-400">I'm a kid</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Bright interactive design, safety guardrails enabled, parent-managed access.</p>
                    </div>
                  </button>

                  {/* Option 2: Teen */}
                  <button
                    onClick={() => executeSignup('teen', null, null)}
                    className="w-full text-left p-4 bg-zinc-950 border border-zinc-850 hover:border-violet-500 hover:bg-violet-950/10 rounded-2xl flex items-center gap-4 group transition-all duration-200"
                  >
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-all">
                      <Smile className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-violet-400">I'm a teen</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Standard workspace design, safety filter on to block inappropriate answers.</p>
                    </div>
                  </button>

                  {/* Option 3: Adult */}
                  <button
                    onClick={() => executeSignup('adult', null, null)}
                    className="w-full text-left p-4 bg-zinc-950 border border-zinc-850 hover:border-indigo-500 hover:bg-indigo-950/10 rounded-2xl flex items-center gap-4 group transition-all duration-200"
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-indigo-400">I'm an adult</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Full open workspace, standard design, toggleable safety filter in settings.</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setShowTailor(false)}
                  className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Account Setup
                </button>
              </>
            ) : (
              /* --- KID TETHER setup --- */
              <>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-2xl bg-pink-950/50 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner mx-auto mb-4">
                    <Baby className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">Parent Tethering</h2>
                  <p className="text-xs text-zinc-400 mt-1">Get a parent to tether their account to yours.</p>
                </div>

                {error && (
                  <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-left">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyParentTether} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Parent's Username
                    </label>
                    <input
                      type="text"
                      required
                      value={parentUsername}
                      onChange={(e) => setParentUsername(e.target.value)}
                      placeholder="e.g., dad_carter"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Parent's Passcode
                    </label>
                    <input
                      type="password"
                      required
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Create Child Passcode
                    </label>
                    <input
                      type="password"
                      required
                      value={childPassword}
                      onChange={(e) => setChildPassword(e.target.value)}
                      placeholder="e.g., 1234"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-pink-500"
                    />
                    <span className="text-[10px] text-zinc-500">The child will enter this passcode to log in.</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setTailorStep('select')}
                      className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl font-semibold text-xs transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800 text-white rounded-xl py-3 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Tether & Setup Account</>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        ) : (
          /* --- LOGIN AND MAIN SIGNUP FORMS --- */
          <>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner mb-4">
                {isAdminSignup ? (
                  <Shield className="h-6 w-6 animate-pulse" />
                ) : (
                  <Lock className="h-6 w-6" />
                )}
              </div>

              <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">
                {isAdminSignup ? (
                  'ADMIN SIGNUP'
                ) : isLoginMode ? (
                  'Ollama Workspace Login'
                ) : (
                  'Create Workspace Account'
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
                {isAdminSignup ? (
                  'Register the primary system administrator account to initialize storage.'
                ) : isLoginMode ? (
                  'Enter your username and passcode to decrypt your workspace.'
                ) : (
                  'Create a regular user workspace account.'
                )}
              </p>
            </div>

            {error && (
              <div className="mb-5 bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4 text-left">
              {/* Admin Signup / User Signup Names */}
              {(!isLoginMode || isAdminSignup) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g., Alex"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 pl-3 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g., Carter"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 pl-3 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., alexc"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>

              {/* Passcode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Passcode / Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>

              {/* Confirm Passcode (Signup only) */}
              {!isLoginMode && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Confirm Passcode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Key className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isAdminSignup ? (
                  <>
                    Initialize System <Shield className="h-4 w-4" />
                  </>
                ) : isLoginMode ? (
                  <>
                    Unlock Vault <LogIn className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Create Account <UserPlus className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Mode Switcher */}
            {!isAdminSignup && (
              <div className="mt-6 text-center text-xs">
                {isLoginMode ? (
                  <p className="text-zinc-500">
                    Don't have an account?{' '}
                    {disableSignups ? (
                      <span className="text-zinc-600 font-semibold cursor-not-allowed">Registrations disabled</span>
                    ) : (
                      <button
                        onClick={() => {
                          setIsLoginMode(false);
                          setError('');
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    )}
                  </p>
                ) : (
                  <p className="text-zinc-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setIsLoginMode(true);
                        setError('');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Security / Decryption Details */}
            <div className="mt-6 pt-5 border-t border-zinc-800 text-[10px] text-zinc-500 text-center leading-relaxed">
              <p className="flex items-center justify-center gap-1 mb-1.5 font-medium text-zinc-400 uppercase tracking-wider text-[9px]">
                <Sparkles className="h-3 w-3 text-indigo-400" /> AES-256 Client-Side Security <Sparkles className="h-3 w-3 text-indigo-400" />
              </p>
              Your names and passcode derive your security key purely in RAM. It is never stored on disk or sent over network, making your data completely inaccessible to anyone else, including the administrator.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
