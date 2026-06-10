import { useState, useEffect, useCallback, useRef } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  verified: boolean;
}

const AUTH_KEY = "mysha_auth_user";

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// Shared state so every component that calls useAuth() gets the same user
// without triggering extra /api/auth/me fetches.
let _user: AuthUser | null = getStoredUser();
let _loading = false;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function setSharedUser(u: AuthUser | null) {
  _user = u;
  if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
  else localStorage.removeItem(AUTH_KEY);
  notify();
}

let _refreshPromise: Promise<void> | null = null;

async function refreshSharedUser() {
  // Deduplicate concurrent calls — only one fetch at a time
  if (_refreshPromise) return _refreshPromise;

  _loading = true;
  notify();

  _refreshPromise = fetch("/api/auth/me", {
    method: "GET",
    credentials: "include", // ← CRITICAL: send session cookie through Vite proxy
    headers: { "Content-Type": "application/json" },
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setSharedUser(data.user ?? null);
      } else {
        // 401 = not logged in. Clear only if there is no stored user
        // (avoids wiping state during a brief network hiccup).
        if (res.status === 401) {
          setSharedUser(null);
        }
      }
    })
    .catch(() => {
      // Network error — keep whatever is in localStorage so the UI stays usable
    })
    .finally(() => {
      _loading = false;
      _refreshPromise = null;
      notify();
    });

  return _refreshPromise;
}

// Run once on module load so the auth check happens as early as possible
refreshSharedUser();

export function useAuth() {
  const [, forceRender] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const listener = () => {
      if (mounted.current) forceRender((n) => n + 1);
    };
    _listeners.add(listener);
    return () => {
      mounted.current = false;
      _listeners.delete(listener);
    };
  }, []);

  const saveUser = useCallback((u: AuthUser | null) => {
    setSharedUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });
    setSharedUser(null);
  }, []);

  const refreshUser = useCallback(() => refreshSharedUser(), []);

  return {
    user: _user,
    loading: _loading,
    saveUser,
    signOut,
    refreshUser,
  };
}
