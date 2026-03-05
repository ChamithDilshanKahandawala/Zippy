import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types/api';

// ─── Context shape ────────────────────────────────────────────────────────────
interface UserContextValue {
  user: UserProfile | null;       // Firestore profile (has role, isVerified, etc.)
  firebaseUser: User | null;      // Raw Firebase Auth user (has getIdToken())
  isLoading: boolean;             // true while determining auth state on startup
  logout: () => Promise<void>;
  refreshProfile: () => void;     // manually trigger a re-fetch (no-op now, kept for API compat)
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser]                 = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading]       = useState(true);

  // Holds the Firestore onSnapshot unsubscribe fn so we can clean it up
  // when the auth user changes or signs out.
  const profileUnsubRef = useRef<Unsubscribe | null>(null);

  const stopProfileListener = () => {
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
  };

  /**
   * Root Auth Listener
   * ─────────────────
   * onAuthStateChanged fires:
   *   • Immediately on mount (resolves initial auth state — avoids flash of login screen)
   *   • On every sign-in / sign-out
   *
   * When a user is logged in we start a Firestore REAL-TIME listener on their
   * profile document. This means role changes (e.g. admin verifies a driver)
   * are reflected in the app instantly without a manual refresh.
   */
  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (fbUser) => {
      // Always clean up the previous profile listener first
      stopProfileListener();

      if (!fbUser) {
        // Signed out — clear everything
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setFirebaseUser(fbUser);

      // Start real-time Firestore listener for this user's profile
      const profileRef = doc(db, 'users', fbUser.uid);
      profileUnsubRef.current = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as UserProfile);
          } else {
            // Firestore doc doesn't exist (e.g. registration failed mid-way)
            setUser(null);
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('[UserContext] Firestore profile listener error:', err);
          setUser(null);
          setIsLoading(false);
        },
      );
    });

    // Cleanup both listeners on unmount
    return () => {
      authUnsub();
      stopProfileListener();
    };
  }, []); // runs once — onAuthStateChanged manages its own re-fires

  const logout = useCallback(async () => {
    stopProfileListener();
    setUser(null);
    setFirebaseUser(null);
    await signOut(auth);
  }, []);

  // Kept for backward-compat — real-time listener makes this a no-op
  const refreshProfile = useCallback(() => {
    // Nothing needed — Firestore onSnapshot keeps the profile in sync automatically
  }, []);

  return (
    <UserContext.Provider value={{ user, firebaseUser, isLoading, logout, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
};
