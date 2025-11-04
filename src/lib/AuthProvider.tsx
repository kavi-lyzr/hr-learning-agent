"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';

export interface TokenData {
  _id: string;
  api_key: string;
  user_id: string;
  organization_id: string;
  usage_id: string;
  policy_id: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  token: string | null;
  email: string | null;
  displayName: string | null;
  credits: number | null;
  totalCredits: number | null;
  usedCredits: number | null;
  refreshCredits: () => Promise<void> | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const pagosUrl = process.env.NEXT_PUBLIC_PAGOS_URL || 'https://pagos-prod.studio.lyzr.ai';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [usedCredits, setUsedCredits] = useState<number>(0);
  const [pagosToken, setPagosToken] = useState<string | null>(null);

  // Prevent duplicate auth calls
  const authCallInProgress = useRef(false);
  const lastSuccessfulAuthCall = useRef<string | null>(null);

  const clearAuthData = useCallback(() => {
    Cookies.remove('user_id');
    Cookies.remove('token');
    Cookies.remove('email');
    Cookies.remove('display_name');
    Cookies.remove('current_organization');
    Cookies.remove('pagos_token');
    setIsAuthenticated(false);
    setUserId(null);
    setToken(null);
    setEmail(null);
    setDisplayName(null);
    setIsLoading(false);
    authCallInProgress.current = false;
    lastSuccessfulAuthCall.current = null;
  }, []);

  const setAuthData = useCallback((tokenData: TokenData, userEmail: string | null, userName: string | null) => {
    setIsAuthenticated(true);
    setUserId(tokenData.user_id);
    setToken(tokenData.api_key);
    setEmail(userEmail);
    setDisplayName(userName);
    Cookies.set('user_id', tokenData.user_id, { expires: 7 });
    Cookies.set('token', tokenData.api_key, { expires: 7 });
    if (userEmail) Cookies.set('email', userEmail, { expires: 7 });
    if (userName) Cookies.set('display_name', userName, { expires: 7 });
  }, []);

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate calls
    if (authCallInProgress.current) {
      console.log('Auth check already in progress, skipping');
      return;
    }

    authCallInProgress.current = true;

    try {
      const { default: lyzr } = await import('lyzr-agent');

      // Silent check - don't trigger UI
      const tokenData = await lyzr.getKeys() as unknown as TokenData[];

      if (tokenData && tokenData[0]) {
        const currentUserId = tokenData[0].user_id;

        // Check if we already successfully synced this user
        if (lastSuccessfulAuthCall.current === currentUserId) {
          console.log('User already synced with backend, skipping duplicate API call');

          // Just update local state without calling backend
          let userEmail: string | null = null;
          let userName: string | null = null;

          try {
            const userKeys = await lyzr.getKeysUser();
            userEmail = userKeys?.data?.user?.email;
            userName = userKeys?.data?.user?.name;
            setCredits(userKeys?.data?.available_credits || 0);
            setPagosToken(userKeys?.token || null);
            Cookies.set('pagos_token', userKeys?.token || null, { expires: 7 });
          } catch (error) {
            console.error('Error fetching user keys, proceeding with token data only.', error);
          }

          const nameFromEmail = userEmail ? userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1) : 'User';
          const finalUserName = userName || nameFromEmail;

          setAuthData(tokenData[0], userEmail, finalUserName);        
          return;
        }

        let userEmail: string | null = null;
        let userName: string | null = null;

        try {
          const userKeys = await lyzr.getKeysUser();
          userEmail = userKeys?.data?.user?.email;
          userName = userKeys?.data?.user?.name;
          setCredits(userKeys?.data?.available_credits || 0);
          setPagosToken(userKeys?.token || null);
          Cookies.set('pagos_token', userKeys?.token || null, { expires: 7 });
        } catch (error) {
          console.error('Error fetching user keys, proceeding with token data only.', error);
        }

        const nameFromEmail = userEmail ? userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1) : 'User';
        const finalUserName = userName || nameFromEmail;

        // Sync with backend - only once per user session
        console.log('Syncing user with backend...');
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: {
              id: tokenData[0].user_id,
              email: userEmail,
              name: finalUserName,
            },
            lyzrApiKey: tokenData[0].api_key,
          }),
        });

        if (response.ok) {
          lastSuccessfulAuthCall.current = currentUserId;
          console.log('✓ User successfully synced with backend');

          setAuthData(tokenData[0], userEmail, finalUserName);

          // Redirect to organizations page after successful auth (only on first login)
          if (window.location.pathname === '/') {
            window.history.pushState({}, '', '/organizations');
          }
        } else {
          console.error('Failed to sync with backend');
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      clearAuthData();
    } finally {
      setIsLoading(false);
      authCallInProgress.current = false;
    }
  }, [clearAuthData, setAuthData]);

  const login = async () => {
    if (typeof window === 'undefined') return;
    try {
      const { default: lyzr } = await import('lyzr-agent');
      await lyzr.logout(); // Ensure clean state before attempting login

      // Initialize with your Lyzr public key
      // TODO: Replace with your actual Lyzr public key from env
      const publicKey = process.env.NEXT_PUBLIC_LYZR_PUBLIC_KEY || 'pk_c14a2728e715d9ea67bf';
      await lyzr.init(publicKey);

      await clearAuthData();

      // This will trigger the login modal
      await lyzr.getKeys();

      // After successful login, check auth
      await checkAuth();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;
    try {
      const { default: lyzr } = await import('lyzr-agent');
      await lyzr.logout();
      clearAuthData();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      clearAuthData();
    }
  };

  // const checkCredits = async () => {
  //   if (typeof window === 'undefined') return 0;
  //   // try {
  //   //   // const { default: lyzr } = await import('lyzr-agent');
  //   //   const userKeys = await lyzr?.getKeysUser();
  //   //   setCredits(userKeys?.data?.available_credits || 0);
  //   //   return credits;
  //   // } catch (error) {
  //   //   console.error('Check credits failed:', error);
  //   //   return 0;  
  //   // }
  //   const publicKey = process.env.NEXT_PUBLIC_LYZR_PUBLIC_KEY || 'pk_c14a2728e715d9ea67bf';
  //   await lyzr.init(publicKey);
  //   const tokenData = await lyzr.getKeys() as unknown as TokenData[];
  //   if (tokenData && tokenData[0]) {
  //     const userKeys = await lyzr.getKeysUser();
  //     setCredits(userKeys?.data?.available_credits || 0);
  //     return userKeys?.data?.available_credits || 0;
  //   }
  //   return 0;
  // };

  const refreshCredits = async (): Promise<void> => {
    try {
      if (!pagosToken){
        setPagosToken(Cookies.get('pagos_token') || null);
      }
      const response = await fetch(`${pagosUrl}/api/v1/usages/current`, {
        method: "GET",
        headers: {
          accept: "application/json",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          authorization: `Bearer ${pagosToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const totalCredits =
        (data.recurring_credits || 0) +
        (data.paid_credits || 0) +
        (data.used_credits || 0);
      const usedCredits = data.used_credits || 0;
      const remainingCredits =
        (data.recurring_credits || 0) + (data.paid_credits || 0);

      setTotalCredits(totalCredits);
      setCredits(remainingCredits);
      setUsedCredits(usedCredits);
    } catch (error) {
      console.error("Error refreshing credits:", error);
    }
  }

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;

      // First, try to restore from cookies to avoid SDK flash
      const savedUserId = Cookies.get('user_id');
      const savedToken = Cookies.get('token');
      const savedEmail = Cookies.get('email');
      const savedDisplayName = Cookies.get('display_name');
      const savedPagosToken = Cookies.get('pagos_token');

      if (savedUserId && savedToken) {
        console.log('Restoring auth from cookies');
        setIsAuthenticated(true);
        setUserId(savedUserId);
        setToken(savedToken);
        setEmail(savedEmail || null);
        setDisplayName(savedDisplayName || null);
        setIsLoading(false);
        setPagosToken(savedPagosToken || null);
        // Mark as already synced to prevent API call
        lastSuccessfulAuthCall.current = savedUserId;
        return;
      }

      try {
        const { default: lyzr } = await import('lyzr-agent');

        // Initialize with your Lyzr public key
        const publicKey = process.env.NEXT_PUBLIC_LYZR_PUBLIC_KEY || 'pk_c14a2728e715d9ea67bf';
        await lyzr.init(publicKey);

        const unsubscribe = lyzr.onAuthStateChange((isAuth) => {
          if (isAuth) {
            checkAuth();
          } else {
            clearAuthData();
          }
        });

        // Perform initial check silently
        try {
          const tokenData = await lyzr.getKeys() as unknown as TokenData[];
          if (tokenData && tokenData[0]) {
            await checkAuth();
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          setIsLoading(false); // Not logged in
        }

        return () => unsubscribe();
      } catch (err) {
        console.error('Lyzr init failed:', err);
        clearAuthData();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId, token, email, displayName, credits, totalCredits, usedCredits, login, logout, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}
