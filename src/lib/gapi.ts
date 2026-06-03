/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GmailMessage, CalendarEvent, CalendarListEntry, DriveFile, GoogleTask, TaskList } from '../types';

// Standard error handler
async function handleResponse(res: Response) {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      errMsg = data.error?.message || errMsg;
    } catch {
      // Ignored
    }
    throw new Error(errMsg);
  }
}

// ==========================================
// Gmail API Client
// ==========================================

export async function listEmails(token: string, query: string = ''): Promise<GmailMessage[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return [];
  await handleResponse(res);
  const data = await res.json();
  if (!data.messages) return [];

  // Fetch detailed info for each message
  const detailPromises = data.messages.map(async (msg: any) => {
    try {
      return await getEmailDetail(token, msg.id);
    } catch (err) {
      console.error(`Failed to load details for ${msg.id}`, err);
      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: 'Failed to load details'
      } as GmailMessage;
    }
  });

  return Promise.all(detailPromises);
}

export async function getEmailDetail(token: string, messageId: string): Promise<GmailMessage> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
  const data = await res.json();

  const headers = data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
  const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

  // Extract body
  let body = '';
  if (data.payload?.parts) {
    const parts = data.payload.parts;
    // Walk parts to find alternative HTML or plain text
    const textPart = parts.find((p: any) => p.mimeType === 'text/html') || parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = decodeBase64Safe(textPart.body.data);
    } else {
      // Nested parts standard
      const firstPart = parts[0];
      if (firstPart?.parts) {
        const nested = firstPart.parts.find((p: any) => p.mimeType === 'text/html') || firstPart.parts.find((p: any) => p.mimeType === 'text/plain');
        if (nested?.body?.data) {
          body = decodeBase64Safe(nested.body.data);
        }
      } else if (firstPart?.body?.data) {
        body = decodeBase64Safe(firstPart.body.data);
      }
    }
  } else if (data.payload?.body?.data) {
    body = decodeBase64Safe(data.payload.body.data);
  }

  // Fallback to snippet if body is empty
  if (!body) {
    body = data.snippet || '';
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    date,
    body,
    labels: data.labelIds || [],
    isUnread: data.labelIds?.includes('UNREAD')
  };
}

// Safely Decode Gmail URL-Safe Base64
function decodeBase64Safe(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (err) {
    console.error('Base64 decode error', err);
    try {
      return atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return 'Body could not be decoded.';
    }
  }
}

export async function sendEmail(token: string, { to, subject, body }: { to: string; subject: string; body: string }): Promise<any> {
  const raw = buildRawEmail(to, subject, body);
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });
  await handleResponse(res);
  return res.json();
}

function buildRawEmail(to: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    '',
    body
  ].join('\r\n');
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ==========================================
// Google Calendar API Client
// ==========================================

export async function listEvents(token: string, { timeMin, timeMax }: { timeMin?: string; timeMax?: string } = {}): Promise<CalendarEvent[]> {
  let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50';
  if (timeMin) url += `&timeMin=${encodeURIComponent(timeMin)}`;
  if (timeMax) url += `&timeMax=${encodeURIComponent(timeMax)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(token: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  await handleResponse(res);
  return res.json();
}

export async function updateCalendarEvent(token: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  await handleResponse(res);
  return res.json();
}

export async function deleteCalendarEvent(token: string, eventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
}

// ==========================================
// Google Drive API Client
// ==========================================

export async function listDriveFiles(token: string, query: string = ''): Promise<DriveFile[]> {
  // Query includes standard files that are not trashed and match title query
  let q = "trashed = false";
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,iconLink,webViewLink,size,modifiedTime,thumbnailLink)&orderBy=folder,name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
  const data = await res.json();
  return data.files || [];
}

export async function uploadDriveFile(token: string, file: File, folderId?: string): Promise<DriveFile> {
  const metadata = {
    name: file.name,
    parents: folderId ? [folderId] : undefined
  };

  const boundary = '---------WorkspaceHubBoundary---------';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  // Convert File to Base64 safely
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    fileBase64 +
    close_delim;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: body
  });
  await handleResponse(res);
  return res.json();
}

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
}

// ==========================================
// Google Tasks API Client
// ==========================================

export async function listTaskLists(token: string): Promise<TaskList[]> {
  const url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
  const data = await res.json();
  return data.items || [];
}

export async function listTasks(token: string, listId: string): Promise<GoogleTask[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
  const data = await res.json();
  return data.items || [];
}

export async function createTask(token: string, listId: string, task: Partial<GoogleTask>): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });
  await handleResponse(res);
  return res.json();
}

/**
 * Updates a task status, title, notes, etc.
 */
export async function updateTask(token: string, listId: string, taskId: string, task: Partial<GoogleTask>): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });
  await handleResponse(res);
  return res.json();
}

export async function deleteTask(token: string, listId: string, taskId: string): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  await handleResponse(res);
}
