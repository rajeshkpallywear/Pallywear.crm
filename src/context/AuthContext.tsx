import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole, UserProfile } from '../types';
import { mockDataService } from '../service/mockDataService';

export interface User {
  id: string;
  email: string;
  role: UserRole | 'admin' | 'user';
  name: string;
  avatar?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  registeredUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User | null }>;
  googleLogin: () => Promise<{ success: boolean; message?: string; user?: User | null }>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  adminOnlyRegistration: boolean;
  setAdminOnlyRegistration: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_USER_KEY = 'pallywear_current_user';
const ADMIN_ONLY_REGISTRATION_KEY = 'pallywear_admin_only_registration';

const formatAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3291B6&color=fff`;

const profileToUser = (profile: { uid: string; email: string; role: UserRole | 'admin' | 'user'; name: string }): User => ({
  id: profile.uid,
  email: profile.email,
  role: profile.role,
  name: profile.name,
  avatar: formatAvatar(profile.name),
  createdAt: new Date().toISOString(),
});

const isAdminEmail = (email: string) => {
  const lowerEmail = email.toLowerCase();
  return lowerEmail === 'ceo@pallywear.com' ||
    lowerEmail === 'rajeshkpallywear@gmail.com' ||
    lowerEmail === 'daniel.smpallywear@gmail.com' ||
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
  return UserRole.STAFF;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOnlyRegistration, setAdminOnlyRegistration] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    const adminOnly = localStorage.getItem(ADMIN_ONLY_REGISTRATION_KEY);
    if (adminOnly !== null) {
      setAdminOnlyRegistration(adminOnly === 'true');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)) {
        setRegisteredUsers([]);
        return;
      }
      try {
        const usersList = await mockDataService.getUsers();
        setRegisteredUsers(usersList.map(profileToUser));
      } catch (error) {
        console.error('Error fetching registered users:', error);
      }
    };
    fetchUsers();
  }, [user]);

  const persistUser = (nextUser: User | null) => {
    if (nextUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const userProfile = await mockDataService.login(normalizedEmail, password);
    if (!userProfile) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const nextUser = profileToUser(userProfile);
    persistUser(nextUser);
    return { success: true, user: nextUser };
  };

  const googleLogin = async () => {
    const users = await mockDataService.getUsers();
    const userProfile = users.find((user) => user.role === UserRole.ADMIN) || users[0];
    if (!userProfile) {
      return { success: false, message: 'No available user for Google login.' };
    }

    const nextUser = profileToUser(userProfile);
    persistUser(nextUser);
    return { success: true, user: nextUser };
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await mockDataService.getUsers();
    const existing = users.find((user) => user.email === normalizedEmail);
    if (existing) {
      return { success: false, message: 'This email is already registered.' };
    }

    const newUserProfile: UserProfile = {
      uid: Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      role: role || getRoleFromEmail(normalizedEmail),
      name: name.trim() || normalizedEmail.split('@')[0],
      password: password
    };

    await mockDataService.register(newUserProfile);
    return { success: true };
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      return;
    }

    const nextUser = { ...user, ...data };
    await mockDataService.updateUser({
      uid: nextUser.id,
      email: nextUser.email,
      name: nextUser.name,
      role: nextUser.role as UserRole,
    });
    persistUser(nextUser);
  };

  const updateUserRole = async (id: string, role: UserRole) => {
    const users = await mockDataService.getUsers();
    const userToUpdate = users.find((profile) => profile.uid === id);
    if (!userToUpdate) {
      return;
    }
    await mockDataService.updateUser({ ...userToUpdate, role });
    if (user?.id === id) {
      persistUser({ ...user, role });
    }
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.STAFF)) {
      const updatedList = await mockDataService.getUsers();
      setRegisteredUsers(updatedList.map(profileToUser));
    }
  };

  const deleteUser = async (id: string) => {
    await mockDataService.deleteUser(id);
    if (user?.id === id) {
      persistUser(null);
    }
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.STAFF)) {
      const updatedList = await mockDataService.getUsers();
      setRegisteredUsers(updatedList.map(profileToUser));
    }
  };

  const logout = async () => {
    persistUser(null);
  };

  const updateAdminOnlyRegistration = (value: boolean) => {
    setAdminOnlyRegistration(value);
    localStorage.setItem(ADMIN_ONLY_REGISTRATION_KEY, JSON.stringify(value));
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
      updateUserRole,
      deleteUser,
      loading,
      adminOnlyRegistration,
      setAdminOnlyRegistration: updateAdminOnlyRegistration
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
