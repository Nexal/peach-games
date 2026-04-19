import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface RequestBody {
  text: string;
  voice_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { text, voice_id }: RequestBody = await req.json();

    if (!text || !voice_id) {
      return new Response(
        JSON.stringify({ error: "Missing text or voice_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voice_id}/stream`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("ElevenLabs API error:", response.status, errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to generate speech", details: errorBody }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const audioData = await response.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(audioData).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    return new Response(
      JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
        success: true,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error generating TTS:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
