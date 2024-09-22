import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAU3HB05KdftEtD98lqQYIsb8qsI7XCSjI",
  authDomain: "kiddl-c969d.firebaseapp.com",
  projectId: "kiddl-c969d",
  storageBucket: "kiddl-c969d.appspot.com",
  messagingSenderId: "1066277274773",
  appId: "1:1066277274773:web:e454f586f9e8b1d349079c",
  measurementId: "G-49WZH50PZ0",
};

// Check if Firebase app is already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistence using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
