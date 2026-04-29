import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1brt7ksrhaEgHGdUxemUKEEU5rzqJw54",
  authDomain: "family-wall-b5f1d.firebaseapp.com",
  projectId: "family-wall-b5f1d",
  storageBucket: "family-wall-b5f1d.firebasestorage.app",
  messagingSenderId: "489876922203",
  appId: "1:489876922203:web:b35bb51ee99c383b2c847e",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
