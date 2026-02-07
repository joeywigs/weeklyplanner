'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@mealflow/shared';
import { apiGet, apiPost } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const res = await apiGet<User>('/auth/me');

    if (res.error) {
      setState({ user: null, loading: false, error: null });
    } else {
      setState({ user: res.data, loading: false, error: null });
    }
  }, []);

  const logout = useCallback(async () => {
    await apiPost('/auth/logout');
    setState({ user: null, loading: false, error: null });
    window.location.href = '/';
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    logout,
    refetch: checkAuth,
  };
}
