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

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      message = payload.error || payload.message || text;
    } catch {
      // Preserve non-JSON error responses as plain text.
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

