import { useState, useCallback } from 'react';
import { checkHealth } from '../services/api';
import { HealthCheckResponse } from '../types/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseHealthCheckReturn {
  data: HealthCheckResponse | null;
  status: Status;
  error: string | null;
  ping: () => Promise<void>;
}

/**
 * Custom hook that encapsulates the backend health-check logic.
 */
export const useHealthCheck = (): UseHealthCheckReturn => {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const ping = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await checkHealth();
      setData(result);
      setStatus('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
    }
  }, []);

  return { data, status, error, ping };
};
