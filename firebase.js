import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <-- Make sure to import this
import { initializeAuth, getReactNativePersistence, indexedDBLocalPersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAU3HB05KdftEtD98lqQYIsb8qsI7XCSjI",
  authDomain: "kiddl-c969d.firebaseapp.com",
  projectId: "kiddl-c969d",
  storageBucket: "kiddl-c969d.appspot.com",
  messagingSenderId: "1066277274773",
  appId: "1:1066277274773:web:e454f586f9e8b1d349079c",
  measurementId: "G-49WZH50PZ0",
};

const app = initializeApp(firebaseConfig);
// Initialize Firebase Auth with AsyncStorage for persistent login sessions
const auth = initializeAuth(app, {
  // persistence: getReactNativePeirsistence(ReactNativeAsyncStorage),
  persistence: indexedDBLocalPersistence,

});
const db = getFirestore(app);

export { auth, db };
