import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously as firebaseSignInAnonymously,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { User } from '../../types';
import { saveUser, updateUserLocation } from '../services/dbService';
import { detectLocation } from '../services/locationService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInAsGuest: (nickname: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    // Check if we have user data in Firestore
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    let userData: User;

                    if (userDocSnap.exists()) {
                        // Existing user: Load their profile (including saved location)
                        const data = userDocSnap.data();
                        userData = {
                            uid: currentUser.uid,
                            displayName: data.displayName || currentUser.displayName || 'Guest',
                            photoURL: data.photoURL || currentUser.photoURL,
                            isAnonymous: currentUser.isAnonymous,
                            location: data.location,
                            totalScore: data.totalScore,
                            maxEndurance: data.maxEndurance
                        };
                        // Optionally update last login time here via saveUser logic if we wanted, 
                        // but specifically for location we trust the DB unless it's missing.
                        if (!userData.location) {
                            const loc = await detectLocation();
                            userData.location = { ...loc, continent: 'Unknown' }; // API might not give continent, standardizing
                            await updateUserLocation(userData.uid, userData.location);
                        }
                    } else {
                        // New User (or first time with DB): Detect location and save
                        const loc = await detectLocation();
                        userData = {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName || 'Guest',
                            photoURL: currentUser.photoURL,
                            isAnonymous: currentUser.isAnonymous,
                            location: {
                                country: loc.country,
                                province: loc.province,
                                continent: 'Unknown' // Ideally map country to continent, but 'Unknown' is safe default for now
                            }
                        };
                        await saveUser(userData);
                    }

                    setUser(userData);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    // Fallback to basic auth info if DB fails
                    setUser({
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || 'Guest',
                        photoURL: currentUser.photoURL,
                        isAnonymous: currentUser.isAnonymous,
                        location: {
                            country: 'Unknown',
                            province: 'Unknown',
                            continent: 'Unknown'
                        }
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInAsGuest = async (nickname: string) => {
        try {
            const result = await firebaseSignInAnonymously(auth);
            if (result.user) {
                // Determine location (reuse logic or just let the hook do it? The hook does it on mount/auth change)
                // The onAuthStateChanged will trigger and create the user with default 'Guest' name.
                // We wait a bit or just overwrite it.
                // To function correctly we really should update the Firestore Doc.

                // Let's ensure we update the name in Firestore
                const userDocRef = doc(db, 'users', result.user.uid);

                // We trust onAuthStateChanged has run or is running. 
                // We'll force update the document with the specific nickname.
                // We might need to wait for the document to be created if it's new.
                // Simplest approach: Just write it.

                // Get location if not present in state yet (it might take a moment)
                // Actually, let's just update the displayName.
                const loc = await detectLocation();

                const userData: User = {
                    uid: result.user.uid,
                    displayName: nickname,
                    photoURL: null,
                    isAnonymous: true,
                    location: {
                        country: loc.country,
                        province: loc.province,
                        continent: 'Unknown'
                    }
                };

                await saveUser(userData);
                setUser(userData); // Update local state immediately
            }
        } catch (error) {
            console.warn("Firebase Anonymous Auth failed (likely disabled). Falling back to local Guest ID.", error);

            // Fallback: Generate a random ID for "Offline/Simulated" Guest
            const fakeUid = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            
            try {
                const loc = await detectLocation();

                const fallbackUserData: User = {
                    uid: fakeUid,
                    displayName: nickname,
                    photoURL: null, // Fallback icon will handle this
                    isAnonymous: true,
                    location: {
                        country: loc.country,
                        province: loc.province,
                        continent: 'Unknown'
                    }
                };

                // Attempt to save to Firestore (might fail if security rules require real auth)
                try {
                    await saveUser(fallbackUserData);
                } catch (dbError) {
                    console.error("Could not save guest user to DB (likely security rules):", dbError);
                    // We continue anyway so they can at least play locally
                }

                setUser(fallbackUserData);
            } catch (setupError) {
                console.error("Critical error setting up guest fallback:", setupError);
                throw setupError;
            }
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAsGuest, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
