
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
// Adicione outros serviços do Firebase que você precisar, como getAuth, getStorage

// IMPORTANTE: Substitua estas configurações pelas configurações REAIS do seu projeto Firebase!
const firebaseConfig = {
  apiKey: "AIzaSyAtOw05Qm7WcJrsHJUcJNUNmdoDfhzJYqQ",
  authDomain: "tietrack-71510.firebaseapp.com",
  projectId: "tietrack",
  storageBucket: "tietrack.firebasestorage.app",
  messagingSenderId: "230701156418",
  appId: "1:230701156418:web:82720ca156abbe233a05db"
};


let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);

export { app, db };
