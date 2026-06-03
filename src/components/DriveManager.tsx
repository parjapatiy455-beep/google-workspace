/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, Search, Trash2, ExternalLink, RefreshCw, Upload, FileText, Image as ImageIcon, Video, File, FolderClosed, FileSpreadsheet, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';
import { DriveFile } from '../types';
import { listDriveFiles, uploadDriveFile, deleteDriveFile } from '../lib/gapi';
import ConfirmationDialog from './ConfirmationDialog';
import { motion } from 'motion/react';

interface DriveManagerProps {
  token: string;
}

export default function DriveManager({ token }: DriveManagerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);

  // Success Status / Errors
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Deletion Checkpoints
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (query: string = '') => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const items = await listDriveFiles(token, query);
      setFiles(items);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Error connecting to Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(searchQuery);
  };

  // Safe file size formatter
  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '-';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Map MIME types to corresponding icons beautifully
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderClosed className="h-5 w-5 text-yellow-500 fill-yellow-50" />;
    }
    if (mimeType.includes('image/')) {
      return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    }
    if (mimeType.includes('video/')) {
      return <Video className="h-5 w-5 text-indigo-500" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType === 'application/vnd.google-apps.spreadsheet') {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType === 'application/vnd.google-apps.document') {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) {
      return <FileArchive className="h-5 w-5 text-amber-600" />;
    }
    return <File className="h-5 w-5 text-neutral-500" />;
  };

  // Upload Logic
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return;
    setUploading(true);
    setErrorStatus(null);
    try {
      await uploadDriveFile(token, uploadedFile);
      setSuccessStatus(`Successfully uploaded "${uploadedFile.name}" to Google Drive.`);
      await fetchFiles(searchQuery);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to complete file upload.');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccessStatus(null), 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Drag and Drop Handles
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Trigger delete checklist
  const triggerDeleteFile = (file: DriveFile) => {
    setFileToDelete(file);
    setConfirmDeleteOpen(true);
  };

  // Perform deletion
  const executeDeleteFile = async () => {
    if (!fileToDelete) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    try {
      await deleteDriveFile(token, fileToDelete.id);
      setSuccessStatus(`File "${fileToDelete.name}" successfully moved to trash.`);
      setFileToDelete(null);
      await fetchFiles(searchQuery);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to delete selected file.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Setup Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-50 text-emerald-600 rounded-xl p-2.5">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-bold text-neutral-900">Google Drive Files</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Explore, search, upload and manage files securely</p>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSearchSubmit} className="relative max-w-[220px] sm:max-w-none">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-xs text-neutral-800 placeholder-neutral-400 rounded-xl pl-9 pr-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-neutral-400" />
          </form>

          <button
            onClick={() => fetchFiles(searchQuery)}
            title="Refresh Files"
            className="rounded-xl border border-neutral-200 p-2.5 text-neutral-500 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* State alerts */}
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

      {/* Drag & Drop File Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer select-none transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
          dragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99] shadow-inner'
            : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-50/90 hover:border-neutral-300'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center space-y-2.5 py-2">
            <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
            <span className="text-sm font-semibold text-neutral-600 animate-pulse">Uploading file content...</span>
          </div>
        ) : (
          <>
            <div className="bg-white text-emerald-600 p-3 rounded-2xl shadow-xs border border-neutral-100">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-neutral-800">
                Drag and drop your file here, or click to choose
              </span>
              <span className="block text-xs text-neutral-400 mt-1">
                Supports word documents, PDFs, spreadsheet files, images, archives and raw media
              </span>
            </div>
          </>
        )}
      </div>

      {/* Files Lists & Tables */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-400 uppercase text-[10px] grid-cols-12 font-bold tracking-wider border-b border-neutral-100">
                <th className="p-4 pl-5">File / Document Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Size</th>
                <th className="p-4">Modified</th>
                <th className="p-4 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading && files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center font-medium text-neutral-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="h-7 w-7 text-emerald-500 animate-spin" />
                      <span>Reading files and folders...</span>
                    </div>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center font-medium text-neutral-400">
                    No files found matching your search.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-neutral-50/40 transition-colors">
                    <td className="p-4 pl-5 font-bold text-neutral-800 truncate max-w-[240px]">
                      <div className="flex items-center space-x-2.5">
                        <div className="shrink-0">{getFileIcon(file.mimeType)}</div>
                        <span className="truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-400 truncate max-w-[150px]">
                      {file.mimeType.replace('application/vnd.google-apps.', '').replace('application/', '')}
                    </td>
                    <td className="p-4 text-neutral-600 font-semibold">{formatBytes(file.size)}</td>
                    <td className="p-4 text-neutral-400 whitespace-nowrap">
                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-xl p-2.5 transition-all text-xs inline-flex items-center"
                            title="Open Google Web View"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => triggerDeleteFile(file)}
                          className="bg-red-50/20 hover:bg-red-50 border border-red-100 text-red-600 rounded-xl p-2.5 transition-all"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory deletion secure dialog checkpoint */}
      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        title="Move File to Trash"
        message={`Are you sure you want to delete and move the file "${fileToDelete?.name || ''}" to trash? This modifies direct cloud documents storage.`}
        confirmText="Yes, Move to Trash"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={executeDeleteFile}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
