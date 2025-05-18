// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtOw05Qm7WcJrsHJUcJNUNmdoDfhzJYqQ",
  authDomain: "tietrack-71510.firebaseapp.com",
  projectId: "tietrack",
  storageBucket: "tietrack.firebasestorage.app",
  messagingSenderId: "230701156418",
  appId: "1:230701156418:web:82720ca156abbe233a05db"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
