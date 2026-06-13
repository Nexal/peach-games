const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = 'gemini-2.0-flash-exp-image-generation';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const TRANSFORM_TIMEOUT = 30000;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }>;
    };
  }>;
}

export async function transformPhoto(
  imageBase64: string,
  prompt: string
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[GeminiTransform] No API key configured, using original photo');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSFORM_TIMEOUT);

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        candidateCount: 1,
      },
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[GeminiTransform] API error:', response.status, await response.text());
      return null;
    }

    const data: GeminiResponse = await response.json();

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }

    console.warn('[GeminiTransform] No image data in response, using original photo');
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
