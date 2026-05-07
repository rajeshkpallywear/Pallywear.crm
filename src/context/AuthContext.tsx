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

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
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
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            let userData = userDoc.data() as User;

            // Auto-promote to admin if email matches whitelist but role is 'user'
            const email = (firebaseUser.email || '').toLowerCase();
            const isAdminEmail = email === 'ceo@pallywear.com' ||
              email === 'ceo@pallywear.com' ||
              email.startsWith('admin') ||
              email.startsWith('ceo');

            if (isAdminEmail && userData.role !== 'admin') {
              userData = { ...userData, role: 'admin' };
              await updateDoc(userDocRef, { role: 'admin' });
            }

            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync registered users list
  useEffect(() => {
    if (!user) {
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
    let normalizedEmail = email.toLowerCase();
    if (normalizedEmail === 'admin') {
      normalizedEmail = 'ceo@pallywear.com';
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
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
        const email = (firebaseUser.email || '').toLowerCase();
        const isAdminEmail = email === 'ceo@pallywear.com' ||
          email === 'ceo@pallywear.com' ||
          email.startsWith('admin') ||
          email.startsWith('ceo');
        const role = isAdminEmail ? 'admin' : 'user';

        const newUser: User = {
          id: firebaseUser.uid,
          email: email,
          role: role as 'user' | 'admin',
          name: firebaseUser.displayName || 'User',
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'User'}&background=3291B6&color=fff`,
          createdAt: new Date().toISOString()
        };

        await setDoc(userDocRef, newUser);
        setUser(newUser);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Google login failed' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = userCredential.user;

      const isAdminEmail = (normalizedEmail === 'ceo@pallywear.com' || normalizedEmail === 'ceo@pallywear.com' || normalizedEmail.startsWith('admin') || normalizedEmail.startsWith('ceo'));
      const role = isAdminEmail ? 'admin' : 'user';

      const newUser: User = {
        id: firebaseUser.uid,
        email: normalizedEmail,
        role: role as 'user' | 'admin',
        name,
        avatar: `https://ui-avatars.com/api/?name=${name}&background=3291B6&color=fff`,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }

      setUser(newUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Registration failed' };
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
      loading
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
