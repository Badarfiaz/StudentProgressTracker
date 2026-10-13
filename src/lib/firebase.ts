import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

/** The only account allowed to delete records. Also enforced in firestore.rules. */
export const SUPER_ADMIN_EMAIL = "badars20plus@gmail.com";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let authInstance: Auth | null = null;

function firebaseApp(): FirebaseApp {
  if (!firebaseConfigured) throw new Error("Firebase is not configured. Fill in .env.local.");
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function auth(): Auth {
  if (!authInstance) authInstance = getAuth(firebaseApp());
  return authInstance;
}

export function db(): Firestore {
  if (!firestore) firestore = getFirestore(firebaseApp());
  return firestore;
}
