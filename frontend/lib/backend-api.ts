const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:4000';

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;

  // Avoid overriding headers for FormData uploads
  const defaultHeaders: Record<string, string> = {};
  if (!(init && (init as any).body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...init,
    credentials: init?.credentials || 'include',
    headers: {
      ...defaultHeaders,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      message = payload.error || payload.message || text;
    } catch {
      // Preserve non-JSON error responses as plain text.
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an incomplete response. Please retry the upload.");
  }
}

