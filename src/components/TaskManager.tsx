/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GoogleTask, TaskList } from '../types';
import { listTaskLists, listTasks, createTask, updateTask, deleteTask } from '../lib/gapi';
import ConfirmationDialog from './ConfirmationDialog';
import { motion, AnimatePresence } from 'motion/react';

interface TaskManagerProps {
  token: string;
}

export default function TaskManager({ token }: TaskManagerProps) {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [listsLoading, setListsLoading] = useState<boolean>(true);

  // Input states
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');

  // Status logs
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Deletion modals
  const [taskToDelete, setTaskToDelete] = useState<GoogleTask | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

  // Load Lists
  const fetchTaskLists = async () => {
    setListsLoading(true);
    setErrorStatus(null);
    try {
      const lists = await listTaskLists(token);
      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Error syncing task lists.');
    } finally {
      setListsLoading(false);
    }
  };

  // Load Tasks under selected List
  const fetchTasksOfList = async (listId: string) => {
    if (!listId) return;
    setLoading(true);
    setErrorStatus(null);
    try {
      const items = await listTasks(token, listId);
      setTasks(items);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Error fetching tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedListId) {
      fetchTasksOfList(selectedListId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListId]);

  // Handle task check/uncheck status mutate
  const handleToggleTaskStatus = async (task: GoogleTask) => {
    const isCompleted = task.status === 'completed';
    const updatedStatus = isCompleted ? 'needsAction' : 'completed';

    // Optimistically update UI local states
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: updatedStatus } : t));

    try {
      await updateTask(token, selectedListId, task.id, {
        id: task.id,
        title: task.title,
        status: updatedStatus
      });
    } catch (err: any) {
      console.error(err);
      setErrorStatus(`Failed to update task status: ${err.message}`);
      // Revert optimism if failed
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setErrorStatus('Task title is required.');
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    try {
      const taskPayload: Partial<GoogleTask> = {
        title: newTaskTitle,
        notes: newTaskNotes || undefined,
        due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined
      };

      await createTask(token, selectedListId, taskPayload);
      setSuccessStatus('Task added successfully!');
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');

      // Refresh list
      await fetchTasksOfList(selectedListId);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to sync task creation.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessStatus(null), 3000);
    }
  };

  // Trigger task delete checklist
  const triggerDeleteTask = (task: GoogleTask) => {
    setTaskToDelete(task);
    setConfirmDeleteOpen(true);
  };

  // Delete actual Task
  const executeDeleteTask = async () => {
    if (!taskToDelete) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    try {
      await deleteTask(token, selectedListId, taskToDelete.id);
      setSuccessStatus(`Removed task "${taskToDelete.title}".`);
      setTaskToDelete(null);
      await fetchTasksOfList(selectedListId);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Failed to delete task.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessStatus(null), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-14rem)] animate-fadeIn">
      {/* Left panel: Task lists & Adding tasks */}
      <div className="lg:col-span-5 space-y-5 border-r border-neutral-100 pr-0 lg:pr-6">
        <div className="flex items-center space-x-2">
          <div className="bg-sky-50 text-sky-600 rounded-xl p-2.5">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-bold text-neutral-900">Google Tasks</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Control check-lists and milestones</p>
          </div>
        </div>

        {/* Task Lists selector dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Selected Tasks List</label>
          <div className="flex items-center space-x-2">
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              disabled={listsLoading}
              className="w-full bg-neutral-50 border border-neutral-200 text-xs rounded-xl px-4 py-2.5 text-neutral-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            >
              {taskLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
            <button
              onClick={fetchTaskLists}
              title="Refresh lists"
              className="rounded-xl border border-neutral-200 p-2.5 text-neutral-500 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition-all"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${listsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick add form */}
        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl">
          <h3 className="font-sans text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">Add Quick task</h3>
          <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
            <div>
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="w-full bg-white text-xs text-neutral-800 placeholder-neutral-400 rounded-xl px-3.5 py-2.5 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
              />
            </div>
            <div>
              <textarea
                placeholder="Notes / context (optional)"
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                rows={2}
                className="w-full bg-white text-xs text-neutral-800 placeholder-neutral-400 rounded-xl px-3.5 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 resize-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="w-full bg-white text-xs text-neutral-800 rounded-xl px-3.5 py-2 border border-neutral-200 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-2.5 font-semibold shadow-xs hover:shadow-sm select-none transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Create Task</span>
            </button>
          </form>
        </div>

        {/* Status markers */}
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
      </div>

      {/* Right panel: Active task checklist */}
      <div className="lg:col-span-7 flex flex-col space-y-4 border border-neutral-200 rounded-2xl bg-neutral-50/40 p-5 shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Active Task Checklist
          </span>
          <button
            onClick={() => fetchTasksOfList(selectedListId)}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2.5 pr-1">
          {loading && tasks.length === 0 ? (
            <div className="py-24 text-center font-medium text-neutral-500 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-7 w-7 text-sky-500 animate-spin" />
              <span>Syncing pending tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-24 text-center px-6 text-neutral-400 border border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <ListTodo className="h-9 w-9 text-neutral-200" />
              <span className="font-semibold text-neutral-600 block">All caught up!</span>
              <span className="text-[11px] text-neutral-400">Everything is fully processed. Start adding your first checklist target.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                return (
                  <motion.div
                    key={task.id}
                    layoutId={`task-${task.id}`}
                    whileHover={{ scale: 1.002 }}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 bg-white transition-all ${
                      isCompleted ? 'border-neutral-100 opacity-60 shadow-xs' : 'border-neutral-200 shadow-sm'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="mt-1 h-4 w-4 rounded-md border-neutral-300 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                    />

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold leading-tight truncate ${isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                        {task.title}
                      </h4>
                      {task.notes && (
                        <p className={`text-[10px] mt-1 text-neutral-400 leading-normal line-clamp-2 ${isCompleted ? 'line-through' : ''}`}>
                          {task.notes}
                        </p>
                      )}
                      {task.due && (
                        <div className="mt-1.5 inline-flex items-center space-x-1 font-mono text-[9px] text-sky-600 bg-sky-50/50 border border-sky-100/50 px-1.5 py-0.5 rounded">
                          <span>Due: {new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Trash Operations */}
                    <button
                      onClick={() => triggerDeleteTask(task)}
                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mandatory secure deletion dialog confirmation on tasks */}
      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        title="Permanently Delete Task"
        message={`Are you sure you want to permanently delete the task "${taskToDelete?.title || ''}"? This task list records will be cleared.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={executeDeleteTask}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setTaskToDelete(null);
        }}
      />
    </div>
  );
}
