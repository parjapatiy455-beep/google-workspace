/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, MapPin, AlignLeft, RefreshCw, X, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../types';
import { listEvents, createCalendarEvent, deleteCalendarEvent } from '../lib/gapi';
import ConfirmationDialog from './ConfirmationDialog';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarManagerProps {
  token: string;
}

type CalendarFilter = 'today' | 'week' | 'upcoming';

export default function CalendarManager({ token }: CalendarManagerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>('upcoming');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Event modal creation state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newLoc, setNewLoc] = useState<string>('');
  const [newStart, setNewStart] = useState<string>('');
  const [newEnd, setNewEnd] = useState<string>('');

  // Confirmation state
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      // Calculate times
      const now = new Date();
      let timeMin = now.toISOString();
      let timeMax: string | undefined = undefined;

      if (activeFilter === 'today') {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        timeMax = endOfDay.toISOString();
      } else if (activeFilter === 'week') {
        const endOfWeek = new Date();
        endOfWeek.setDate(now.getDate() + 7);
        timeMax = endOfWeek.toISOString();
      }
      
      const items = await listEvents(token, { timeMin, timeMax });
      setEvents(items);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Error syncing Calendar data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeFilter]);

  // Handle Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStart || !newEnd) {
      setErrorStatus('Title, Start time, and End time are required.');
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    try {
      const eventPayload: Partial<CalendarEvent> = {
        summary: newTitle,
        description: newDesc || undefined,
        location: newLoc || undefined,
        start: {
          dateTime: new Date(newStart).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(newEnd).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      await createCalendarEvent(token, eventPayload);
      setSuccessMessage('Event scheduled successfully!');
      
      // Clear forms
      setNewTitle('');
      setNewDesc('');
      setNewLoc('');
      setNewStart('');
      setNewEnd('');
      setIsCreating(false);

      // Refresh events
      await fetchCalendarEvents();
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to schedule new event.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Trigger delete procedure
  const triggerDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setConfirmDeleteOpen(true);
  };

  // Perform actual event deletion
  const executeDeleteEvent = async () => {
    if (!eventToDelete) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    try {
      await deleteCalendarEvent(token, eventToDelete.id);
      setSuccessMessage(`Event "${eventToDelete.summary}" removed successfully.`);
      setEventToDelete(null);
      await fetchCalendarEvents();
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to delete event.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const formatEventTime = (dateTimeStr?: string, dateStr?: string) => {
    if (dateTimeStr) {
      return new Date(dateTimeStr).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (dateStr) {
      return 'All Day';
    }
    return '';
  };

  const formatEventDate = (dateTimeStr?: string, dateStr?: string) => {
    const rawDate = dateTimeStr || dateStr;
    if (!rawDate) return '';
    return new Date(rawDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-50 text-blue-600 rounded-xl p-2.5">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-bold text-neutral-900">Google Calendar</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Manage your meetings and appointments from this hub</p>
          </div>
        </div>

        {/* Buttons and Filter Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-neutral-100 rounded-xl p-1 text-xs font-semibold">
            {(['today', 'week', 'upcoming'] as CalendarFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer capitalize ${
                  activeFilter === filter
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            onClick={fetchCalendarEvents}
            title="Refresh schedule"
            className="rounded-xl border border-neutral-200 p-2 text-neutral-500 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* State alerts */}
      {errorStatus && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-start space-x-2.5 animate-fadeIn">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorStatus}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-4 flex items-start space-x-2.5 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Events Planner Container */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50 text-xs font-bold text-neutral-400 uppercase tracking-wider">
          Agenda Flow
        </div>

        {loading && events.length === 0 ? (
          <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
            <span>Syncing events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center px-6">
            <Calendar className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
            <span className="block font-semibold text-neutral-700">Perfect Clear!</span>
            <span className="block text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              No meetings or schedule records match your scope for {activeFilter}. Re-schedule or select another timeline.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-neutral-50/40 transition-colors"
              >
                {/* Time Indicators */}
                <div className="flex items-start space-x-3.5 shrink-0 md:w-44">
                  <div className="bg-blue-50 text-blue-600 rounded-xl p-2 shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 leading-none">
                      {formatEventTime(event.start.dateTime, event.start.date)}
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {formatEventDate(event.start.dateTime, event.start.date)}
                    </p>
                  </div>
                </div>

                {/* Info and detail summary */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    {event.summary}
                  </h3>
                  {event.description && (
                    <div className="flex items-start space-x-1.5 text-neutral-500">
                      <AlignLeft className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{event.description}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center space-x-1.5 text-neutral-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Operations */}
                <div className="flex items-center justify-end shrink-0">
                  <button
                    onClick={() => triggerDeleteEvent(event)}
                    title="Delete meeting"
                    className="rounded-xl p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Dialog (Modal) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 bg-neutral-50">
                <div className="flex items-center space-x-2 text-neutral-800">
                  <Plus className="h-4.5 w-4.5 text-blue-500" />
                  <span className="text-sm font-bold font-sans">Sync New Meeting</span>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateEvent}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Alignment Session"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        required
                        className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        required
                        className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Meet / Google Office, SG"
                      value={newLoc}
                      onChange={(e) => setNewLoc(e.target.value)}
                      className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Add event context notes, guidelines or agendas..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-5 py-4 border-t border-neutral-100 space-x-3 bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 bg-white hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all"
                  >
                    <span>Schedule Event</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory event deletion structural confirmation modal */}
      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        title="Remove Calendar Record"
        message={`Are you sure you want to permanently cancel and remove the event "${eventToDelete?.summary || ''}"? This action modifies your primary Google Calendar schedules directly.`}
        confirmText="Confirm Delete"
        cancelText="Keep Event"
        isDestructive={true}
        onConfirm={executeDeleteEvent}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setEventToDelete(null);
        }}
      />
    </div>
  );
}
