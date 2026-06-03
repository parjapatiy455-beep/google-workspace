/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            {/* Top header border/accent color */}
            <div className={`h-1.5 w-full ${isDestructive ? 'bg-red-500' : 'bg-blue-500'}`} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start space-x-3">
                <div className={`rounded-xl p-2.5 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-sans text-lg font-semibold text-neutral-900">
                    {title}
                  </h3>
                  <div className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {message}
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors ${
                    isDestructive
                      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
