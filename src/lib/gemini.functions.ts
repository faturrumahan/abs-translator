import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TokenInput = z.object({
  apiKey: z.string().min(10, "Gemini API key is required"),
});

/**
 * Exchanges the user's Gemini API key for a short-lived Live auth token.
 * The key is used for this request only and never persisted server-side.
 */
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
      // Ephemeral tokens are not available on every account tier: fall back
      // to a direct browser session with the user's own key.
    }

    return { token: data.apiKey, ephemeral: false };
  });
