let cachedApiKey: string | null = null;
let fetchPromise: Promise<string> | null = null;

export async function getGoogleMapsApiKey(): Promise<string> {
  // Check client-side Vite env first
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }

  if (cachedApiKey !== null) {
    return cachedApiKey;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/config/maps');
      if (!res.ok) return '';
      const data = await res.json();
      cachedApiKey = (data.apiKey && typeof data.apiKey === 'string') ? data.apiKey.trim() : '';
      return cachedApiKey;
    } catch (err) {
      console.warn('[Maps Config] Failed to fetch server maps key:', err);
      cachedApiKey = '';
      return '';
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}
