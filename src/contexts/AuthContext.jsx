import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    deleteUser
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    function googleSignIn() {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Heartbeat: Update lastSeen every 60 seconds
    useEffect(() => {
        if (!currentUser) return;

        const updatePresence = async () => {
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    lastSeen: serverTimestamp(),
                    email: currentUser.email // Ensure email is fresh too
                });
            } catch (e) {
                console.error("Error updating presence:", e);
            }
        };

        // Update immediately on mount/login
        updatePresence();

        // Update every 60s
        const interval = setInterval(updatePresence, 60000);

        // Update when tab becomes visible (addresses throttling)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePresence();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [currentUser]);

    function deleteAccount() {
        return deleteUser(auth.currentUser);
    }

    const value = {
        currentUser,
        signup,
        login,
        logout,
        googleSignIn,
        deleteAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
