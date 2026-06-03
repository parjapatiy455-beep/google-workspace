/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Mail, Calendar, CheckSquare, HardDrive, Search, ArrowRight, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { listEmails, listEvents, listDriveFiles, listTaskLists, listTasks } from '../lib/gapi';
import { GmailMessage, CalendarEvent, DriveFile, GoogleTask } from '../types';
import { motion } from 'motion/react';

interface DashboardOverviewProps {
  token: string;
  onNavigate: (tab: 'gmail' | 'calendar' | 'drive' | 'tasks') => void;
}

export default function DashboardOverview({ token, onNavigate }: DashboardOverviewProps) {
  // Counters
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [todayEventCount, setTodayEventCount] = useState<number>(0);
  const [pendingTaskCount, setPendingTaskCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick lists for briefing
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [unreadMails, setUnreadMails] = useState<GmailMessage[]>([]);
  const [recentTasks, setRecentTasks] = useState<GoogleTask[]>([]);

  // Unified global search states
  const [globalQuery, setGlobalQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTriggered, setSearchTriggered] = useState<boolean>(false);
  
  // Search results
  const [gmailResults, setGmailResults] = useState<GmailMessage[]>([]);
  const [calendarResults, setCalendarResults] = useState<CalendarEvent[]>([]);
  const [driveResults, setDriveResults] = useState<DriveFile[]>([]);
  const [taskResults, setTaskResults] = useState<GoogleTask[]>([]);

  const loadBriefings = async () => {
    setLoading(true);
    try {
      // 1. Fetch Calendar events (Today's)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      
      const events = await listEvents(token, { timeMin: startOfDay, timeMax: endOfDay });
      setTodayEvents(events);
      setTodayEventCount(events.length);

      // 2. Fetch Emails (Inbox unread)
      const mails = await listEmails(token, 'label:UNREAD');
      setUnreadMails(mails.slice(0, 3));
      setUnreadCount(mails.length);

      // 3. Fetch Tasks (Pending from primary list)
      const taskLists = await listTaskLists(token);
      if (taskLists.length > 0) {
        const activeTasks = await listTasks(token, taskLists[0].id);
        const filteredPending = activeTasks.filter(t => t.status === 'needsAction');
        setRecentTasks(filteredPending.slice(0, 3));
        setPendingTaskCount(filteredPending.length);
      }
    } catch (err) {
      console.error('Failed to sync dashboard briefing counters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalQuery.trim()) {
      setSearchTriggered(false);
      return;
    }

    setIsSearching(true);
    setSearchTriggered(true);

    try {
      // Query everything in parallel safely
      const [mails, events, files, taskLists] = await Promise.all([
        listEmails(token, globalQuery).catch(() => []),
        listEvents(token, { timeMin: new Date().toISOString() }).catch(() => []),
        listDriveFiles(token, globalQuery).catch(() => []),
        listTaskLists(token).catch(() => [])
      ]);

      // Filter events matching title locally since GAPI calendar list has limited filter parameters
      const filteredEvents = events.filter(e => 
        e.summary.toLowerCase().includes(globalQuery.toLowerCase()) || 
        e.description?.toLowerCase().includes(globalQuery.toLowerCase())
      );

      // Fetch Tasks from lists matching query
      let matchedTasks: GoogleTask[] = [];
      if (taskLists.length > 0) {
        const allTasks = await listTasks(token, taskLists[0].id).catch(() => []);
        matchedTasks = allTasks.filter(t => 
          t.title.toLowerCase().includes(globalQuery.toLowerCase()) ||
          t.notes?.toLowerCase().includes(globalQuery.toLowerCase())
        );
      }

      setGmailResults(mails.slice(0, 5));
      setCalendarResults(filteredEvents.slice(0, 5));
      setDriveResults(files.slice(0, 5));
      setTaskResults(matchedTasks.slice(0, 5));

    } catch (err) {
      console.error('Global workspace search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setGlobalQuery('');
    setSearchTriggered(false);
    setGmailResults([]);
    setCalendarResults([]);
    setDriveResults([]);
    setTaskResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar Block */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 h-40 w-40 rounded-full bg-blue-50/40 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 h-32 w-32 rounded-full bg-emerald-50/30 blur-2xl pointer-events-none" />

        <div className="flex-1 space-y-1 z-10">
          <div className="flex items-center space-x-1.5 text-blue-600 font-semibold text-xs">
            <Sparkles className="h-4 w-4" />
            <span>Unified Search Assistant</span>
          </div>
          <h1 className="font-sans text-xl md:text-2xl font-black text-neutral-800 leading-tight">
            How can we help you today?
          </h1>
          <p className="text-neutral-400 text-xs shrink-0 max-w-md">
            Query across Gmail, Calendar schedules, Drive documents or Task lists from a single interface.
          </p>
        </div>

        {/* Global form */}
        <form onSubmit={handleGlobalSearch} className="relative w-full md:max-w-md z-10">
          <input
            type="text"
            placeholder="Search emails, meetings, files or tasks..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            className="w-full bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-xs font-semibold text-neutral-800 placeholder-neutral-400 rounded-2xl pl-10 pr-20 py-3.5 border border-neutral-200 focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 transition-all shadow-xs"
          />
          <Search className="absolute left-3.5 top-4 h-4 w-4 text-neutral-400" />
          
          <div className="absolute right-2 top-2 flex items-center space-x-1">
            {searchTriggered && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[10px] text-neutral-400 hover:text-neutral-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-neutral-100"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold shadow-xs select-none cursor-pointer transition-all"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {searchTriggered ? (
        /* ==================== GLOBAL SEARCH RESULTS VIEW ==================== */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-neutral-500 uppercase tracking-widest">
              Search results for "{globalQuery}"
            </h2>
            <button
              onClick={handleClearSearch}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors"
            >
              Back to Overview
            </button>
          </div>

          {isSearching ? (
            <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center space-y-2 bg-white rounded-3xl border border-neutral-200">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <span>Scanning workspace directory...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gmail Results */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center space-x-2 text-red-600 border-b border-neutral-50 pb-2">
                  <Mail className="h-4.5 w-4.5" />
                  <span className="font-sans text-xs font-bold uppercase tracking-wider">Gmail inbox ({gmailResults.length})</span>
                </div>
                {gmailResults.length === 0 ? (
                  <span className="block text-xs text-neutral-400 italic py-2">No matching emails.</span>
                ) : (
                  <div className="space-y-2">
                    {gmailResults.map(mail => (
                      <div key={mail.id} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-red-50/10 cursor-pointer text-xs" onClick={() => onNavigate('gmail')}>
                        <span className="block font-bold text-neutral-800 truncate mb-0.5">{mail.subject}</span>
                        <span className="block text-[10px] text-neutral-400 truncate">{mail.snippet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendar Results */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center space-x-2 text-blue-600 border-b border-neutral-50 pb-2">
                  <Calendar className="h-4.5 w-4.5" />
                  <span className="font-sans text-xs font-bold uppercase tracking-wider">Calendar Scheduled ({calendarResults.length})</span>
                </div>
                {calendarResults.length === 0 ? (
                  <span className="block text-xs text-neutral-400 italic py-2">No upcoming matching events.</span>
                ) : (
                  <div className="space-y-2">
                    {calendarResults.map(event => (
                      <div key={event.id} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-blue-50/10 cursor-pointer text-xs" onClick={() => onNavigate('calendar')}>
                        <span className="block font-bold text-neutral-800 truncate mb-0.5">{event.summary}</span>
                        {event.start && (
                          <span className="block text-[10px] text-neutral-400 font-mono">
                            {new Date(event.start.dateTime || event.start.date || '').toLocaleDateString(undefined, { dateStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Drive Results */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center space-x-2 text-emerald-600 border-b border-neutral-50 pb-2">
                  <HardDrive className="h-4.5 w-4.5" />
                  <span className="font-sans text-xs font-bold uppercase tracking-wider">Google Drive Files ({driveResults.length})</span>
                </div>
                {driveResults.length === 0 ? (
                  <span className="block text-xs text-neutral-400 italic py-2">No matching cloud documents.</span>
                ) : (
                  <div className="space-y-2">
                    {driveResults.map(file => (
                      <div key={file.id} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-emerald-50/10 cursor-pointer text-xs" onClick={() => onNavigate('drive')}>
                        <span className="block font-bold text-neutral-800 truncate">{file.name}</span>
                        <span className="block text-[10px] text-neutral-400">{file.mimeType.replace('application/', '')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Checklist Results */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center space-x-2 text-sky-600 border-b border-neutral-50 pb-2">
                  <CheckSquare className="h-4.5 w-4.5" />
                  <span className="font-sans text-xs font-bold uppercase tracking-wider">Tasks Checklist ({taskResults.length})</span>
                </div>
                {taskResults.length === 0 ? (
                  <span className="block text-xs text-neutral-400 italic py-2">No matching checklists.</span>
                ) : (
                  <div className="space-y-2">
                    {taskResults.map(task => (
                      <div key={task.id} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-sky-50/10 cursor-pointer text-xs" onClick={() => onNavigate('tasks')}>
                        <span className={`block font-bold truncate ${task.status === 'completed' ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                          {task.title}
                        </span>
                        {task.notes && <span className="block text-[10px] text-neutral-400 truncate mt-0.5">{task.notes}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==================== NORMAL DASHBOARD OVERVIEW VIEW ==================== */
        <div className="space-y-6">
          {/* Bento Stats Counters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Stat: Gmail */}
            <div
              onClick={() => onNavigate('gmail')}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs cursor-pointer select-none transition-all duration-200 flex items-center justify-between group"
            >
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Gmail Inbox
                </span>
                <span className="block text-2xl font-bold text-slate-850">
                  {loading ? '-' : `${unreadCount} unread`}
                </span>
              </div>
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl transition-all group-hover:scale-105 border border-red-100">
                <Mail className="h-5 w-5" />
              </div>
            </div>

            {/* Stat: Calendar */}
            <div
              onClick={() => onNavigate('calendar')}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs cursor-pointer select-none transition-all duration-200 flex items-center justify-between group"
            >
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Today's Schedule
                </span>
                <span className="block text-2xl font-bold text-slate-850">
                  {loading ? '-' : `${todayEventCount} events`}
                </span>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl transition-all group-hover:scale-105 border border-blue-100">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            {/* Stat: Tasks */}
            <div
              onClick={() => onNavigate('tasks')}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs cursor-pointer select-none transition-all duration-200 flex items-center justify-between group"
            >
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Pending Milestones
                </span>
                <span className="block text-2xl font-bold text-slate-850">
                  {loading ? '-' : `${pendingTaskCount} active`}
                </span>
              </div>
              <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl transition-all group-hover:scale-105 border border-sky-100">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Daily briefings details bento panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Agenda Brief panel - Span 7 */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Today's Timeline</span>
                </div>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Schedule Organizer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">Syncing times...</div>
              ) : todayEvents.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400 italic">No meetings scheduled for today. Perfect day to focus!</div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {todayEvents.map(event => {
                    const timeStr = event.start.dateTime 
                      ? new Date(event.start.dateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) 
                      : 'All-Day';
                    return (
                      <div key={event.id} className="flex gap-4 items-start">
                        <span className="font-mono text-xs font-semibold text-slate-400 w-12 pt-1 shrink-0">{timeStr}</span>
                        <div className="flex-1 bg-blue-50/70 border-l-[4px] border-blue-600 p-3 rounded-r-xl">
                          <span className="font-bold text-xs text-slate-800 block">{event.summary}</span>
                          {event.location && <span className="block text-[10px] text-slate-400 font-semibold mt-1">📍 {event.location}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Summary Panels - Span 5 */}
            <div className="lg:col-span-5 space-y-6">
              {/* Unread Mails Quick glance */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Priority Emails</span>
                  <button onClick={() => onNavigate('gmail')} className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer">Open Gmail</button>
                </div>
                
                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Scanning inbox...</div>
                ) : unreadMails.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">Inbox is spotless!</div>
                ) : (
                  <div className="space-y-3">
                    {unreadMails.map(mail => {
                      const initial = mail.from ? mail.from.charAt(0).toUpperCase() : 'M';
                      return (
                        <div 
                          key={mail.id} 
                          className="flex items-center justify-between hover:bg-slate-50 p-2.5 rounded-xl cursor-pointer transition-all gap-2" 
                          onClick={() => onNavigate('gmail')}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-650 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0 ml-1.5">
                            <span className="font-bold text-xs text-slate-800 truncate block">{mail.subject}</span>
                            <span className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">{mail.snippet}</span>
                          </div>
                          <div className="time-col font-mono text-[10px] text-slate-400 shrink-0 whitespace-nowrap pl-1">
                            {mail.date ? new Date(mail.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pending Quick Tasks lookup */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recent Checklist</span>
                  <button onClick={() => onNavigate('tasks')} className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer">Add Task</button>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Scanning priorities...</div>
                ) : recentTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">All targets achieved.</div>
                ) : (
                  <div className="space-y-2">
                    {recentTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="text-xs p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-350 cursor-pointer flex items-center justify-between gap-2.5 transition-all" 
                        onClick={() => onNavigate('tasks')}
                      >
                        <span className="font-semibold text-slate-700 truncate">{task.title}</span>
                        {task.due && (
                          <span className="text-[9px] shrink-0 font-mono font-bold bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100">
                            {new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
