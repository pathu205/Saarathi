// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLiAyfzvDtivBHQJEAcyksXi4ttMhHGOU",
  authDomain: "busconnect-cd7e2.firebaseapp.com",
  projectId: "busconnect-cd7e2",
  storageBucket: "busconnect-cd7e2.firebasestorage.app",
  messagingSenderId: "88128136369",
  appId: "1:88128136369:web:65f941004b7406e9082e90",
  measurementId: "G-CGPXGV1QWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


export { db };
export { auth };