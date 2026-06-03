/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, Send, RefreshCw, PenSquare, ArrowLeft, CheckCircle2, AlertCircle, Eye, Inbox } from 'lucide-react';
import { GmailMessage } from '../types';
import { listEmails, getEmailDetail, sendEmail } from '../lib/gapi';
import ConfirmationDialog from './ConfirmationDialog';

interface GmailManagerProps {
  token: string;
}

export default function GmailManager({ token }: GmailManagerProps) {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMail, setSelectedMail] = useState<GmailMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Compose State
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');

  // Confirmation Dialogue States
  const [confirmSendOpen, setConfirmSendOpen] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const fetchGmail = async (query: string = '') => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const msgs = await listEmails(token, query);
      setEmails(msgs);
      if (msgs.length > 0 && !selectedMail) {
        setSelectedMail(msgs[0]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Error fetching messages from Gmail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGmail(searchQuery);
  };

  const handleSelectEmail = async (emailId: string) => {
    setDetailLoading(true);
    try {
      const detailed = await getEmailDetail(token, emailId);
      setSelectedMail(detailed);
      
      // Update read status in local state list
      setEmails(prev => prev.map(m => m.id === emailId ? { ...m, isUnread: false } : m));
    } catch (err: any) {
      console.error(err);
      setErrorStatus('Failed to load email details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const triggerSendEmail = () => {
    if (!composeTo.trim()) {
      setErrorStatus('Recipient address (To:) is required.');
      return;
    }
    setConfirmSendOpen(true);
  };

  const executeSendEmail = async () => {
    setConfirmSendOpen(false);
    setLoading(true);
    try {
      await sendEmail(token, {
        to: composeTo,
        subject: composeSubject,
        body: composeBody
      });
      setSuccessStatus(`Email sent successfully to ${composeTo}!`);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setIsComposing(false);
      // Wait shortly and refresh list
      setTimeout(() => {
        fetchGmail();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to send email.');
    } finally {
      setLoading(false);
    }
  };

  // Format name labels nicely
  const formatSender = (senderStr: string) => {
    if (!senderStr) return 'Unknown Sender';
    const cleanSender = senderStr.replace(/"/g, '');
    const bracketIndex = cleanSender.indexOf('<');
    if (bracketIndex !== -1) {
      return cleanSender.substring(0, bracketIndex).trim() || cleanSender.substring(bracketIndex + 1, cleanSender.length - 1);
    }
    return cleanSender;
  };

  const formatSenderSub = (senderStr: string) => {
    if (!senderStr) return '';
    const bracketIndex = senderStr.indexOf('<');
    if (bracketIndex !== -1) {
      return senderStr.substring(bracketIndex);
    }
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-14rem)]">
      {/* List Panel - 5 Columns */}
      <div className="lg:col-span-5 flex flex-col space-y-4 border-r border-neutral-100 pr-0 lg:pr-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-red-50 text-red-600 rounded-xl p-2.5">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="font-sans text-xl font-bold text-neutral-900">Gmail Inbox</h2>
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => fetchGmail(searchQuery)}
              title="Refresh Inbox"
              className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsComposing(true)}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all"
            >
              <PenSquare className="h-4 w-4" />
              <span>Compose</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl pl-10 pr-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
        </form>

        {/* Status messages */}
        {errorStatus && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start space-x-2 animate-fadeIn">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorStatus}</span>
          </div>
        )}
        {successStatus && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 flex items-start space-x-2 animate-fadeIn">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{successStatus}</span>
          </div>
        )}

        {/* Emails list container */}
        <div className="flex-1 overflow-y-auto max-h-[500px] lg:max-h-[600px] space-y-2 pr-1">
          {loading && emails.length === 0 ? (
            <div className="py-20 text-center text-sm text-neutral-500 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-red-400 animate-spin" />
              <span>Loading messages...</span>
            </div>
          ) : emails.length === 0 ? (
            <div className="py-20 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center space-y-3 p-6">
              <Inbox className="h-10 w-10 text-neutral-300" />
              <span>No direct matches found in inbox.</span>
            </div>
          ) : (
            emails.map((email) => {
              const isActive = selectedMail?.id === email.id;
              return (
                <motion.div
                  key={email.id}
                  onClick={() => handleSelectEmail(email.id)}
                  whileHover={{ y: -1 }}
                  className={`relative p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                    isActive
                      ? 'bg-red-50/40 border-red-200 shadow-sm ring-1 ring-red-100'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start space-x-1 mb-1">
                    <span className={`font-sans text-xs font-semibold max-w-[70%] truncate ${email.isUnread ? 'text-black font-extrabold' : 'text-neutral-700'}`}>
                      {formatSender(email.from || '')}
                    </span>
                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                      {new Date(email.date || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className={`text-xs mb-1 truncate ${email.isUnread ? 'text-neutral-900 font-semibold' : 'text-neutral-600'}`}>
                    {email.subject}
                  </h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-normal">
                    {email.snippet}
                  </p>

                  {/* Unread circle */}
                  {email.isUnread && (
                    <div className="absolute top-4.5 right-3.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Details Panel - 7 Columns */}
      <div className="lg:col-span-7 flex flex-col min-h-[400px] border border-neutral-200 rounded-2xl bg-neutral-50/40 overflow-hidden shadow-sm">
        {detailLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-sm text-neutral-500 space-y-3 bg-white">
            <RefreshCw className="h-8 w-8 text-neutral-400 animate-spin" />
            <span>Loading message details...</span>
          </div>
        ) : selectedMail ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 flex items-start justify-between">
              <div>
                <h3 className="font-sans text-base font-bold text-neutral-900 mb-2 leading-snug">
                  {selectedMail.subject}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-xs text-red-600 border border-neutral-200">
                    {formatSender(selectedMail.from || '').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <div className="text-neutral-800 font-medium">
                      {formatSender(selectedMail.from || '')} <span className="text-neutral-400 font-normal text-[10px]">{formatSenderSub(selectedMail.from || '')}</span>
                    </div>
                    <div className="text-neutral-400 text-[10px]">
                      {selectedMail.date ? new Date(selectedMail.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                {selectedMail.labels?.includes('UNREAD') ? (
                  <span className="bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-md">Unread</span>
                ) : (
                  <span className="bg-neutral-100 text-neutral-500 font-medium px-2 py-0.5 rounded-md">Read</span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[450px]">
              {selectedMail.body?.includes('<div') || selectedMail.body?.includes('<p') ? (
                // If contains basic html structure, embed in fine sandbox iframe or safely render as raw text with line breaks
                <div 
                  className="text-sm prose prose-neutral text-neutral-700 leading-relaxed overflow-x-auto GmailBodyContainer" 
                  dangerouslySetInnerHTML={{ __html: selectedMail.body }} 
                />
              ) : (
                <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedMail.body}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-sm text-neutral-400 px-6 text-center">
            <Mail className="h-12 w-12 text-neutral-200 mb-3" />
            <span className="font-semibold text-neutral-700">No message selected</span>
            <span className="text-xs text-neutral-400 mt-1">Select an email from your inbox to view full correspondence details.</span>
          </div>
        )}
      </div>

      {/* Compose Dialog (Modal) */}
      <AnimatePresence>
        {isComposing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposing(false)}
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
                  <PenSquare className="h-4.5 w-4.5 text-red-500" />
                  <span className="text-sm font-bold font-sans">New Message</span>
                </div>
                <button
                  onClick={() => setIsComposing(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 uppercase tracking-wider font-semibold transition-colors"
                >
                  Discard
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">To</label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    required
                    className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Enter email subject"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Message Body</label>
                  <textarea
                    rows={8}
                    placeholder="Write your email body here..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full bg-neutral-50 focus:bg-white text-sm text-neutral-800 placeholder-neutral-400 rounded-xl px-4 py-3 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end px-5 py-4 border-t border-neutral-100 space-x-3 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 bg-white hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={triggerSendEmail}
                  className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Mail</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog before sending emails */}
      <ConfirmationDialog
        isOpen={confirmSendOpen}
        title="Confirm Email Dispatch"
        message={`Are you sure you want to send this email to ${composeTo}? This operation will dispatch the message immediately.`}
        confirmText="Yes, Send"
        cancelText="Cancel"
        isDestructive={false}
        onConfirm={executeSendEmail}
        onCancel={() => setConfirmSendOpen(false)}
      />
    </div>
  );
}
