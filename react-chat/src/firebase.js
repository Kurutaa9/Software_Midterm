import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDIHT8_-oTtVPXdak2rOV6ZR4WSgMHT-98",
  authDomain: "chatterbogs.firebaseapp.com",
  projectId: "chatterbogs",
  storageBucket: "chatterbogs.firebasestorage.app",
  messagingSenderId: "238319650336",
  appId: "1:238319650336:web:45059dd62db6154e409e45",
  measurementId: "G-SBHSE0W0LT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
