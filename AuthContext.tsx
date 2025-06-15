import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Make sure this exists and is configured
import { Profile } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: 'teacher' | 'student') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Legacy hook
export const useAuth = useAuthContext;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profileError) {
            console.error('Error fetching profile in init:', profileError);
          }
          setProfile(profileData);
        }
      } catch (e) {
        console.error('Error in AuthProvider init:', e);
        setLoading(false);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            setUser(session.user);
            // Create a profile object from user metadata
            const profileData: Profile = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              role: session.user.user_metadata?.role || 'student',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setProfile(profileData);
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (e) {
          console.error('Error in onAuthStateChange:', e);
          setUser(null);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (data?.user) {
        setUser(data.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        setProfile(profileData);
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'teacher' | 'student'
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name, // Store full name in user metadata
            role: role // Store role in user metadata
          }
        }
      });

      if (data.user && !error) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          name,
          role,
        });
        // If student, insert into students table
        if (role === 'student') {
          await supabase.from('students').insert({
            user_id: data.user.id
          });
        }
        // If teacher, insert into teachers table
        if (role === 'teacher') {
          await supabase.from('teachers').insert({
            id: data.user.id
          });
        }
        // Fetch the full profile (with created_at, updated_at, etc.)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setUser(data.user);
        setProfile(profileData);
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
    return { error };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await signIn(email, password);
    return !error;
  };

  const logout = () => {
    signOut();
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
