import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GEMINI_AUDIO_MODEL, VOICE_AUDIO_PROMPT } from "./prompts";

/** Turns a raw Gemini SDK error into a readable user-facing message. */
function geminiError(err: unknown, context: string): Error {
  const raw = err instanceof Error ? err.message : String(err);
  // Auth / key problems
  if (
    /unauthenticated|api[_ ]?key|401|403|permission|invalid.*key|key.*invalid|forbidden|credentials/i.test(
      raw,
    )
  ) {
    return new Error(
      "API key Gemini tidak valid atau ditolak. Pastikan key kamu dari aistudio.google.com/apikey.",
    );
  }
  // Surface the real Gemini message for everything else so it's debuggable
  return new Error(raw ? `${context}: ${raw}` : `${context}. Coba lagi.`);
}

// ─── Key validation ──────────────────────────────────────────────────────────

const ValidateInput = z.object({
  apiKey: z.string().min(10, "Gemini API key is required"),
});

/**
 * Makes a minimal text-only Gemini call to verify the key works.
 * Uses the stable generateContent endpoint (works for all key types).
 */
export const validateGeminiKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ValidateInput.parse(input))
  .handler(async ({ data }) => {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: data.apiKey });
    try {
      await ai.models.generateContent({
        model: GEMINI_AUDIO_MODEL,
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
      });
    } catch (err) {
      throw geminiError(err, "Tidak bisa terhubung ke Gemini");
    }
    return { valid: true };
  });

// ─── Live token (kept for potential future use) ───────────────────────────────

const TokenInput = z.object({
  apiKey: z.string().min(10, "Gemini API key is required"),
});

export const createGeminiLiveToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenInput.parse(input))
  .handler(async ({ data }) => {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: data.apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    try {
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 15 * 60_000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 2 * 60_000).toISOString(),
        },
      });
      if (token.name) return { token: token.name, ephemeral: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/api[_ ]?key|401|403|permission/i.test(message)) {
        throw new Error("API key Gemini kamu ditolak. Cek lagi ya.");
      }
      // Ephemeral tokens not available on all account tiers — fall back to direct key
    }

    return { token: data.apiKey, ephemeral: false };
  });

// ─── Audio transcription + corporate translation ──────────────────────────────

const AudioInput = z.object({
  apiKey: z.string().min(10, "Gemini API key is required"),
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

/**
 * Sends recorded audio to Gemini (generateContent) for transcription +
 * corporate Indonesian translation in a single call.
 * Returns { transcript, corporate }.
 */
export const transcribeAndTranslate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AudioInput.parse(input))
  .handler(async ({ data }) => {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: data.apiKey });

    let responseText: string;
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_AUDIO_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: data.audioBase64, mimeType: data.mimeType } },
              { text: VOICE_AUDIO_PROMPT },
            ],
          },
        ],
      });
      responseText = result.text ?? "";
    } catch (err) {
      throw geminiError(err, "Gagal memproses audio dengan Gemini");
    }

    // Model may wrap JSON in markdown fences — extract the first {...} block
    const match = responseText.match(/\{[\s\S]*?\}/);
    if (!match) {
      throw new Error(`Respons Gemini tidak dapat diparsing: "${responseText.slice(0, 300)}"`);
    }

    let parsed: { transcript?: string; corporate?: string };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Gagal memproses respons JSON dari Gemini. Coba lagi.");
    }

    return {
      transcript: parsed.transcript ?? "",
      corporate: parsed.corporate ?? "",
    };
  });
