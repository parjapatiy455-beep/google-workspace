export interface UserProfile {
  name: string;
  email: string;
  photoUrl: string;
}

// Gmail Types
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
  labels?: string[];
  isUnread?: boolean;
}

export interface GmailDraft {
  id: string;
  message?: {
    id: string;
  };
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

// Drive Types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
}

// Tasks Types
export interface TaskList {
  id: string;
  title: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  dueFormatted?: string;
}
