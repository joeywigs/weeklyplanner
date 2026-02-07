import type { ApiResponse } from '@mealflow/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok) {
      return {
        data: null,
        error: json.error || `Request failed with status ${res.status}`,
      };
    }

    return json;
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: 'DELETE' });
}

export { API_URL };
