const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/transform-avatar`;
const TRANSFORM_TIMEOUT = 35000;

export async function transformPhoto(
  imageBase64: string,
  clanName: string
): Promise<string | null> {
  if (!SUPABASE_URL) {
    console.warn('[GeminiTransform] No Supabase URL configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSFORM_TIMEOUT);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ imageBase64, clanName }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[GeminiTransform] Edge function error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.transformedBase64) {
      return data.transformedBase64;
    }

    console.warn('[GeminiTransform] No transformed image in response, using original photo');
    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[GeminiTransform] Request timed out, using original photo');
    } else {
      console.error('[GeminiTransform] Error:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
