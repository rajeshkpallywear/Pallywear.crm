import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';

export interface User {
  id: string;
  email: string;
  role: UserRole | 'admin' | 'user';
  name: string;
  avatar?: string;
  createdAt: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  registeredUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  googleLogin: () => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  adminOnlyRegistration: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAdminEmail = (email: string) => {
  const lowerEmail = email.toLowerCase();
  return lowerEmail === 'ceo@pallywear.com' ||
    lowerEmail === 'rajeshkpallywear@gmail.com' ||
    lowerEmail === 'stalingm.mano@gmail.com' ||
    lowerEmail === 'admin' ||
    lowerEmail.startsWith('admin') ||
    lowerEmail.startsWith('ceo');
};

const getRoleFromEmail = (email: string): UserRole => {
  const lower = email.toLowerCase();
  if (isAdminEmail(lower)) return UserRole.ADMIN;
  if (lower.startsWith('staff')) return UserRole.STAFF;
  if (lower.startsWith('user')) return UserRole.MARKETING;
  if (lower.startsWith('account')) return UserRole.ACCOUNTS;
  if (lower.startsWith('order') || lower.startsWith('hub')) return UserRole.ORDER_MANAGEMENT;
  if (lower.startsWith('prod') || lower.startsWith('factory')) return UserRole.PRODUCTION;
  if (lower.startsWith('del') || lower.startsWith('delyvery')) return UserRole.DELIVERY;
  if (lower.startsWith('tele') || lower.startsWith('call')) return UserRole.TELECALLER;
  
  // Support telecaller employee names (round-robin list)
  const telecallers = ['vivek', 'vimal', 'arumugam', 'deepika', 'mohan', 'yuvaraj'];
  if (telecallers.some(name => lower.startsWith(name))) {
    return UserRole.TELECALLER;
  }
  
  return UserRole.STAFF;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOnlyRegistration, setAdminOnlyRegistration] = useState(false);

  // Validate Connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    // Fetch and listen to global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'registration'), (snapshot) => {
      if (snapshot.exists()) {
        setAdminOnlyRegistration(snapshot.data().adminOnlyRegistration ?? true);
      }
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              let userData = { ...userDoc.data(), id: firebaseUser.uid } as User;

              const email = firebaseUser.email || '';
              const isEligibleForAdmin = isAdminEmail(email);

              if (isEligibleForAdmin && userData.role !== 'admin') {
                userData = { ...userData, role: 'admin' };
                try {
                  await updateDoc(userDocRef, { role: 'admin' });
                } catch (err) {
                  console.warn('Non-blocking: Failed to update user role in Firestore:', err);
                }
              }

              setUser(userData);
            } else {
              // AUTO-PROFILE RECOVERY
              const email = firebaseUser.email || '';
              const role = getRoleFromEmail(email);
              const newUser: User = {
                id: firebaseUser.uid,
                email: email,
                role: role,
                name: firebaseUser.displayName || email.split('@')[0].split('.')[0],
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=3291B6&color=fff`,
                createdAt: new Date().toISOString()
              };

              await setDoc(userDocRef, newUser);
              setUser(newUser);
            }
          } catch (error) {
            console.error('Firestore sync error:', error);
            // Don't throw here, just set user to null so they stay on login
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync registered users list
  useEffect(() => {
    if (!user || !user.role) {
      setRegisteredUsers([]);
      return;
    }

    const path = 'users';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as User);
      setRegisteredUsers(users);
    }, (error) => {
      console.warn('Registration sync limited: ', error.message);
    });

    return () => unsubscribe();
  }, [user]);

  const login = async (email: string, password: string) => {
    let normalizedEmail = email.trim().toLowerCase();

    // Auto-registration / auto-login for Mano
    if (normalizedEmail === 'stalingm.mano@gmail.com' && password === 'pallywear12') {
      try {
        // Try standard sign in first
        const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          const newUser: User = {
            id: result.user.uid,
            email: normalizedEmail,
            role: 'admin',
            name: 'Mano',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        } else {
          if (userDoc.data().role !== 'admin') {
            try {
              await updateDoc(userDocRef, { role: 'admin' });
            } catch (err) {
              console.warn('Non-blocking: Failed to update user role to admin on login:', err);
            }
            setUser({ ...userDoc.data(), id: result.user.uid, role: 'admin' } as User);
          } else {
            setUser({ ...userDoc.data(), id: result.user.uid } as User);
          }
        }
        return { success: true };
      } catch (error: any) {
        // If user doesn't exist or credentials fail, we register them as admin if the password matches pallywear12
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const firebaseUser = userCredential.user;
            const newUser: User = {
              id: firebaseUser.uid,
              email: normalizedEmail,
              role: 'admin',
              name: 'Mano',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Mano')}&background=3291B6&color=fff`,
              createdAt: new Date().toISOString()
            };
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, newUser);
            setUser(newUser);
            return { success: true };
          } catch (regError: any) {
            console.error('Auto-registration of Mano failed:', regError);
          }
        }
      }
    }

    let portalName = '';
    // Removed shorthand portal mapping logic to enforce separate registered logins

    try {
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);

      // Manual sync: Fetch the user document immediately to ensure state is ready
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUser({ ...userDoc.data(), id: result.user.uid } as User);
      } else {
        // Fallback for missing profile during login
        const role = getRoleFromEmail(normalizedEmail);
        const newUser: User = {
          id: result.user.uid,
          email: normalizedEmail,
          role: role,
          name: normalizedEmail.split('@')[0],
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newUser);
        setUser(newUser);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
      return {
        success: false,
        message: error.message || 'Wrong email or password.'
      };
    }
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const email = firebaseUser.email || '';
        const role = isAdminEmail(email) ? 'admin' : 'user';

        const newUser: User = {
          id: firebaseUser.uid,
          email: email,
          role: role as 'user' | 'admin',
          name: firebaseUser.displayName || 'User',
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}&background=3291B6&color=fff`,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        } catch (error) {
          console.error('Error creating user document after Google Login:', error);
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Google login failed' };
    }
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = userCredential.user;

      const finalRole = role || getRoleFromEmail(normalizedEmail);

      const newUser: User = {
        id: firebaseUser.uid,
        email: normalizedEmail,
        role: finalRole,
        name: name.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=3291B6&color=fff`,
        createdAt: new Date().toISOString()
      };

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userDocRef, newUser);
        console.log('User document created successfully in Firestore');
      } catch (error) {
        console.error('Error creating user document:', error);
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }

      setUser(newUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Registration failed', code: error.code };
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.id), data);
        setUser(prev => prev ? { ...prev, ...data } : null);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
      }
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      registeredUsers,
      login,
      googleLogin,
      register,
      logout,
      updateProfile,
      deleteUser,
      loading,
      adminOnlyRegistration
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
