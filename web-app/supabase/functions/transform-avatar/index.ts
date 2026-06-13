import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_MODEL = "gemini-3.1-flash-image";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TRANSFORM_TIMEOUT = 30000;

interface RequestBody {
  imageBase64: string;
  clanName: string;
}

const CLAN_PROMPTS: Record<string, string> = {
  "Klan Peruna":
    "Transform this portrait photo into a powerful Slavic thunder god warrior avatar. " +
    "Apply golden lightning streaks (#FFD700) across the face and background. " +
    "Add eagle feather motifs and crackling electrical energy. " +
    "Style: dark fantasy painterly, dramatic lighting with gold highlights, " +
    "fierce warrior expression, Slavic pagan symbols (thunder marks, Perun axe). " +
    "Keep the face structure recognizable but enhance with divine features. " +
    "Background: stormy sky with lightning bolts. " +
    "Square format, high detail, game avatar style.",
  "Klan Welesa":
    "Transform this portrait photo into a mysterious Slavic serpent mage avatar. " +
    "Apply purple magical aura (#8A2BE2) with ethereal glow around the face. " +
    "Add serpent scale texture on skin, snake eyes with vertical pupils. " +
    "Style: dark mystical painterly, moonlight illumination with purple shadows, " +
    "cunning sorcerer expression, Slavic pagan symbols (Veles serpent, trident). " +
    "Keep the face structure recognizable but enhance with magical features. " +
    "Background: deep forest at night, glowing runes floating. " +
    "Square format, high detail, game avatar style.",
  "Klan Mokoszy":
    "Transform this portrait photo into a serene Slavic water and earth goddess avatar. " +
    "Apply green nature hues (#2E8B57) with flowing water patterns across the face. " +
    "Add vine and leaf motifs woven into hair, dew drops on skin. " +
    "Style: ethereal nature painterly, soft daylight through forest canopy, " +
    "gentle nurturing expression, Slavic pagan symbols (Mokosz spindle, wheat sheaf). " +
    "Keep the face structure recognizable but enhance with divine features. " +
    "Background: sacred spring with water lilies and birch trees. " +
    "Square format, high detail, game avatar style.",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, clanName }: RequestBody = await req.json();

    if (!imageBase64 || !clanName) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 or clanName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const prompt = CLAN_PROMPTS[clanName];
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: `Unknown clan: ${clanName}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRANSFORM_TIMEOUT);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
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

    const response = await fetch(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API error:", response.status, errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to transform avatar", details: errorBody }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return new Response(
          JSON.stringify({ transformedBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "No image data in Gemini response" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Transform timed out" }),
        { status: 504, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.error("Error transforming avatar:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
