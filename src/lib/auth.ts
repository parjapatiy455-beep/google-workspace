/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize the single Firebase instance
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize analytics safely if supported in the user's browser environment
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch((err) => {
  console.warn('Analytics initialization skipped:', err);
});

const provider = new GoogleAuthProvider();

// Request selected Workspace scopes
const scopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/tasks'
];

scopes.forEach(scope => provider.addScope(scope));

// Flags & token storage in memory (session standard)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Allow session fallback storage if user reloads so they do not get booted on every minute layout refresh
// In-memory cache is preferred, but for seamless AI Studio reload experience, let's support session state caching.
// Wait! The guidelines strictly say:
// "You MUST implement in-memory caching for the access token. Do NOT store the access token in `localStorage` or `sessionStorage`."
// Understood! We will store it STRICTLY in memory only, in respect of the security guidelines constraint.

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token was lost. Needs sign-in to refresh Google oauth session token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
