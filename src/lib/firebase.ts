import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { ReflectionEntry, UserProfile, ChatMessage } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfigJson) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom database ID from config if available
export const db = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Strip undefined recursively to prevent Firestore errors
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Auth helpers
export async function signInWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL
  };
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL
      });
    } else {
      callback(null);
    }
  });
}

// Firestore Reflection helpers - User Isolated under /users/{userId}/reflections/{reflectionId}
export function getReflectionsCollection(userId: string) {
  return collection(db, 'users', userId, 'reflections');
}

export function getReflectionDoc(userId: string, reflectionId: string) {
  return doc(db, 'users', userId, 'reflections', reflectionId);
}

export async function saveReflectionToFirestore(
  userId: string,
  entry: ReflectionEntry
): Promise<void> {
  if (!userId) throw new Error('User ID is required to save reflections');
  const ref = getReflectionDoc(userId, entry.id);
  const dataToSave = {
    ...entry,
    location: entry.location && entry.location.placeName ? {
      placeName: entry.location.placeName.trim(),
      placeId: entry.location.placeId ? entry.location.placeId.trim() : null,
      address: entry.location.address ? entry.location.address.trim() : null
    } : null,
    userId,
    updatedAt: Date.now()
  };
  const cleanedData = cleanUndefined(dataToSave);
  await setDoc(ref, cleanedData, { merge: true });
}

export async function deleteReflectionFromFirestore(
  userId: string,
  reflectionId: string
): Promise<void> {
  if (!userId) throw new Error('User ID is required to delete reflections');
  const ref = getReflectionDoc(userId, reflectionId);
  await deleteDoc(ref);
}

export function subscribeToUserReflections(
  userId: string,
  onData: (entries: ReflectionEntry[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const q = query(getReflectionsCollection(userId), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: ReflectionEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          content: data.content || '',
          summary: data.summary || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          mood: data.mood || 'thoughtful',
          sentimentScore: typeof data.sentimentScore === 'number' ? data.sentimentScore : undefined,
          sentimentLabel: data.sentimentLabel || undefined,
          sentimentReasoning: data.sentimentReasoning || undefined,
          location: data.location && data.location.placeName
            ? {
                placeName: String(data.location.placeName),
                placeId: data.location.placeId ? String(data.location.placeId) : undefined,
                address: data.location.address ? String(data.location.address) : undefined
              }
            : undefined,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          messages: Array.isArray(data.messages) ? data.messages : []
        });
      });
      onData(entries);
    },
    (err) => {
      console.error('Firestore listener error:', err);
      if (onError) onError(err);
    }
  );
}

// User Theme Persistence
export async function saveUserTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { theme, themeUpdatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('Could not save theme to Firestore user profile:', err);
  }
}

export async function getUserTheme(userId: string): Promise<'light' | 'dark' | 'system' | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.theme === 'light' || data?.theme === 'dark' || data?.theme === 'system') {
        return data.theme;
      }
    }
  } catch (err) {
    console.warn('Could not get theme from Firestore user profile:', err);
  }
  return null;
}

