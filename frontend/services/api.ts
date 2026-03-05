import { ApiResponse, RegisterPayload, UserProfile } from '../types/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Generic fetch wrapper ───────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Is the backend running?');
    }
    throw err;
  }
}

// ─── Health ──────────────────────────────────────────────────────────────────
export interface HealthCheckResponse {
  success: boolean;
  status: 'ok' | 'degraded';
  message: string;
  firebase: 'connected' | 'disconnected';
  timestamp: string;
  environment: string;
}

export const checkHealth = (): Promise<HealthCheckResponse> =>
  apiFetch<HealthCheckResponse>('/api/health');

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const registerUser = (
  payload: RegisterPayload,
): Promise<ApiResponse<UserProfile>> =>
  apiFetch<ApiResponse<UserProfile>>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminStats = (idToken: string) =>
  apiFetch('/api/admin/stats', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
