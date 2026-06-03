/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Mail,
  Calendar as CalendarIcon,
  HardDrive,
  CheckSquare,
  LogOut,
  Sparkles,
  Menu,
  X,
  RefreshCw,
  Lock
} from 'lucide-react';
import { User } from 'firebase/auth';

// Setup Imports
import { initAuth, googleSignIn, logout } from './lib/auth';
import DashboardOverview from './components/DashboardOverview';
import GmailManager from './components/GmailManager';
import CalendarManager from './components/CalendarManager';
import DriveManager from './components/DriveManager';
import TaskManager from './components/TaskManager';

type AppTab = 'dashboard' | 'gmail' | 'calendar' | 'drive' | 'tasks';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    // Listen to Firebase authentication status
    const unsubscribe = initAuth(
      (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setAuthChecking(false);
      },
      () => {
        // Needs manual click to trigger OAuth flow and acquire fresh session tokens
        setNeedsAuth(true);
        setAuthChecking(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Google authorization flow triggered cancellation or failure', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Nav Links setup
  const navItems = [
    { id: 'dashboard', label: 'Hub Center', icon: LayoutDashboard, color: 'text-neutral-500' },
    { id: 'gmail', label: 'Gmail Client', icon: Mail, color: 'text-red-500' },
    { id: 'calendar', label: 'Event Planner', icon: CalendarIcon, color: 'text-blue-500' },
    { id: 'drive', label: 'Cloud Drive', icon: HardDrive, color: 'text-emerald-500' },
    { id: 'tasks', label: 'Milestones', icon: CheckSquare, color: 'text-sky-500' }
  ] as const;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-neutral-500 animate-pulse">Syncing safety systems...</span>
      </div>
    );
  }

  if (needsAuth) {
    /* ==================== LOGIN AUTH LANDING SCREEN ==================== */
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {/* Soft elegant structural ambient vectors in background */}
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-100/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xl z-10 space-y-6"
        >
          {/* Logo Heading area */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg transform rotate-6">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-black text-neutral-900 tracking-tight">
                Workspace Hub
              </h1>
              <p className="text-neutral-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                Sign in with your Google account to coordinate emails, meetings, file attachments, and checklists from one unified slate.
              </p>
            </div>
          </div>

          {/* Bullet previews */}
          <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-neutral-100 space-y-3 text-xs leading-normal">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800">Gmail Inbox & Dispatch</span>
                <p className="text-neutral-400 text-[11px] mt-0.5">Read unread correspondence streams, conduct full inbox index search, and dispatch email drafts.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800">Visual Schedules Planner</span>
                <p className="text-neutral-400 text-[11px] mt-0.5">Sync appointment blocks, list meeting slots sequentially, and schedule new Google Calendar events.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800">Cloud Drive Storage</span>
                <p className="text-neutral-400 text-[11px] mt-0.5">Browse cloud storage archives, search filenames, and drag-and-drop binaries for auto-uploads.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800">Milestone Checklists</span>
                <p className="text-neutral-400 text-[11px] mt-0.5">Synchronize Google Tasks, toggle completion checkboxes, and add quick agendas with due dates.</p>
              </div>
            </div>
          </div>

          {/* Secure details info */}
          <div className="flex items-center space-x-2 text-[10px] text-neutral-400 justify-center bg-slate-50 border border-slate-100/80 rounded-xl py-2 px-3">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span>Direct OAuth login. Your access token is kept in-memory.</span>
          </div>

          {/* Google Sign In button markup from SKILL guidelines */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={`gsi-material-button w-full flex items-center justify-center relative select-none cursor-pointer border border-neutral-350 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm ${
                isLoggingIn ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center justify-center space-x-3">
                <div className="gsi-material-button-icon shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-sans">
                  {isLoggingIn ? 'Syncing Authorization...' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ==================== HOME AUTHORIZED APPLICATION WORKSPACE ==================== */
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Navigation Sidebar Drawer - Left desktop side */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-slate-200 flex-col p-6 shrink-0 h-full justify-between">
        <div className="space-y-8">
          {/* Branded Logo/Heading Area */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('dashboard')}>
            <div className="h-[34px] w-[34px] rounded-lg bg-gradient-to-tr from-blue-600 via-[#4285F4] to-emerald-500 flex items-center justify-center shadow-md transform hover:rotate-3 transition-all duration-200">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="block font-bold text-base text-slate-900 tracking-tight leading-none">Workspace Hub</span>
              <span className="block text-[10px] text-slate-400 mt-1 font-bold tracking-wider uppercase leading-none">Google Integration</span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400/80 uppercase tracking-widest px-3 mb-2.5">Workspace Nodes</span>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold select-none cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-100/90 text-blue-600 border border-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer with Sync Action Card */}
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Google Workspace</div>
            <div className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Synchronized
            </div>
            <button
              onClick={handleLogin}
              title="Refresh credentials"
              className="mt-3 w-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-350 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 text-slate-400" />
              Force Re-Sync
            </button>
          </div>
        </div>
      </aside>

      {/* Main Core View Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        
        {/* Top Main Navigation Bar */}
        <header className="h-[72px] bg-white border-b border-slate-200/85 px-8 sticky top-0 z-30 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger menu */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden rounded-lg p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
            </button>

            {/* Account connected badge */}
            <div className="status-badge flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600">
              <div className="status-dot w-2 h-2 rounded-full bg-emerald-500"></div>
              Google Connected
            </div>
          </div>

          {/* Right side Profile Details & Actions */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="font-bold text-slate-800 text-xs leading-none">{user.displayName || 'Authorized User'}</span>
                <span className="text-slate-500 text-[10px] mt-1.5 leading-none font-medium">{user.email}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    referrerPolicy="no-referrer"
                    alt="user google portrait"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              
              {/* Standard logout button */}
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                title="Sign out of Hub"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        {/* Interior Workspace Scroll Layer */}
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          <div className="animate-fadeIn">
            {activeTab === 'dashboard' && <DashboardOverview token={token!} onNavigate={setActiveTab} />}
            {activeTab === 'gmail' && <GmailManager token={token!} />}
            {activeTab === 'calendar' && <CalendarManager token={token!} />}
            {activeTab === 'drive' && <DriveManager token={token!} />}
            {activeTab === 'tasks' && <TaskManager token={token!} />}
          </div>
        </div>
      </main>

      {/* Mobile Navigation Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Drawer Container */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 p-5 space-y-6 z-50 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-6">
                {/* Title and Close */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-900">Hub Setup</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-700 rounded-lg p-1 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-slate-100 text-slate-950 border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 text-center font-semibold">
                Authorized Session
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
