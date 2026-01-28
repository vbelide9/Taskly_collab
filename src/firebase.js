import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB0XzyfGQXB3vSDE7NIzmRZFtC60gxzrXk",
    authDomain: "reminders-app-backend.firebaseapp.com",
    projectId: "reminders-app-backend",
    storageBucket: "reminders-app-backend.firebasestorage.app",
    messagingSenderId: "846873839231",
    appId: "1:846873839231:web:be352a912904b3185aa14a",
    measurementId: "G-NSPRE8B46B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
