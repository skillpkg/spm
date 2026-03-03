import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@spm/web-auth';

interface UseAdminDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAdminData = <T>(
  fetcher: (token: string) => Promise<T>,
  deps: unknown[] = [],
): UseAdminDataResult<T> => {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError('Not authenticated');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcher(token)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, ...deps]);

  return { data, isLoading, error, refetch };
};
