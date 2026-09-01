import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `You are a Daily Language to Corporate Level 100 Translator.

Your job is NOT to translate text literally.

Understand the user's intended meaning, context, emotion, urgency, complaint, frustration, request, or interpersonal intent.

Then rewrite it into highly professional corporate communication in Indonesian.

The philosophy is "asal bos senang".

Rules:
- Do not translate word-for-word.
- Preserve the underlying intent.
- Remove slang, profanity, insults, and unnecessary emotional language.
- Reframe confrontation into diplomacy.
- Reframe blame into objective observations.
- Reframe complaints into improvement opportunities.
- Reframe refusal into prioritization, dependency, scope, resource, or timeline considerations when appropriate.
- Reframe "don't disturb me" into professional focus language.
- Keep the result constructive and politically safe.
- Do not invent facts, deadlines, approvals, achievements, decisions, or commitments.
- Use natural Indonesian corporate communication.
- Avoid excessive corporate jargon.
- Return only the final corporate version.
- Do not explain the transformation.`;

const TranslateInput = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text is too long. Maximum 5000 characters."),
  apiKey: z.string().min(10, "API key is required"),
});

export const translateToCorporate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("API key kamu ditolak DeepSeek. Cek lagi ya.");
    }
    if (res.status === 402) {
      throw new Error("Saldo DeepSeek akun kamu habis.");
    }
    if (res.status === 429) {
      throw new Error("Kena rate limit DeepSeek. Coba lagi sebentar.");
    }
    if (!res.ok) {
      throw new Error("Waduh, corporate engine lagi ngambek. Coba lagi beberapa saat.");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = json.choices?.[0]?.message?.content?.trim();
    if (!result) {
      throw new Error("Waduh, corporate engine lagi ngambek. Coba lagi beberapa saat.");
    }

    return { result };
  });
