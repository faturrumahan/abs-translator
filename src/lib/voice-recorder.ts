// Browser voice recorder: MediaRecorder (mic) → Gemini transcribe+translate → SpeechSynthesis
// Flow: start() captures audio, stop() sends to Gemini then speaks the corporate result.

export type VoiceState = "IDLE" | "RECORDING" | "PROCESSING" | "SPEAKING" | "ERROR";

// Keep the VoiceSession alias so the import in index.tsx stays clean
export type VoiceSession = VoiceRecorder;

type Handlers = {
  onState: (state: VoiceState) => void;
  onUserText: (text: string) => void;
  onCorporateText: (text: string) => void;
  onError: (message: string) => void;
  /**
   * Called with base-64 audio + MIME type after the user clicks End.
   * Should send to Gemini and return { transcript, corporate }.
   */
  onAudioReady: (
    audioBase64: string,
    mimeType: string,
  ) => Promise<{ transcript: string; lang: string; corporate: string }>;
};

function chooseMimeType(): string {
  // Prefer ogg/opus (Gemini confirmed support) then fall back to webm
  for (const t of ["audio/ogg;codecs=opus", "audio/ogg", "audio/webm;codecs=opus", "audio/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data-URL prefix ("data:<mime>;base64,")
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Find the best available SpeechSynthesis voice for a given BCP-47 language tag.
 * Priority: exact match → same language prefix → first available.
 */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const lower = lang.toLowerCase();
  const prefix = lower.split("-")[0]!;

  // 1. Exact match (e.g. "id-ID")
  const exact = voices.find((v) => v.lang.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Same language family (e.g. "id-ID" → "id-XX")
  const family = voices.find((v) => v.lang.toLowerCase().startsWith(prefix + "-"));
  if (family) return family;

  // 3. Bare prefix match (e.g. "id")
  const bare = voices.find((v) => v.lang.toLowerCase() === prefix);
  if (bare) return bare;

  // 4. No match — return null so the browser uses its default for the lang tag
  return null;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private mimeType = "";
  private destroyed = false;

  constructor(private handlers: Handlers) {}

  async start() {
    this.destroyed = false;
    this.chunks = [];

    // Request mic access
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      this.handlers.onError("Akses mikrofon ditolak. Izinkan mic di browser ya.");
      this.handlers.onState("ERROR");
      return;
    }

    this.mimeType = chooseMimeType();

    const options = this.mimeType ? { mimeType: this.mimeType } : {};
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      // Use the actual mimeType the recorder chose (may differ from requested)
      this.mimeType = this.mediaRecorder.mimeType || "audio/webm";
    } catch {
      this.handlers.onError("Browser kamu tidak mendukung perekaman audio.");
      this.handlers.onState("ERROR");
      this.stopStream();
      return;
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstart = () => {
      if (!this.destroyed) this.handlers.onState("RECORDING");
    };

    this.mediaRecorder.start(200); // collect a chunk every 200 ms
  }

  async stop() {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      this.handlers.onState("IDLE");
      return;
    }

    await new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        this.stopStream();

        if (this.destroyed || blob.size === 0) {
          this.handlers.onState("IDLE");
          resolve();
          return;
        }

        this.handlers.onState("PROCESSING");

        let transcript = "";
        let lang = "id-ID";
        let corporate = "";

        try {
          const base64 = await blobToBase64(blob);
          // Strip codec details from mimeType for Gemini (e.g. "audio/webm;codecs=opus" → "audio/webm")
          const cleanMime = this.mimeType.split(";")[0]!;
          ({ transcript, lang, corporate } = await this.handlers.onAudioReady(base64, cleanMime));
        } catch (err) {
          if (!this.destroyed) {
            this.handlers.onError(
              err instanceof Error && err.message
                ? err.message
                : "Gagal memproses audio. Coba lagi.",
            );
            this.handlers.onState("ERROR");
          }
          resolve();
          return;
        }

        if (this.destroyed) {
          resolve();
          return;
        }

        this.handlers.onUserText(transcript);
        this.handlers.onCorporateText(corporate);
        await this.speak(corporate, lang);
        resolve();
      };

      this.mediaRecorder!.stop();
    });
  }

  private speak(text: string, lang: string): Promise<void> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth || !text) {
        this.handlers.onState("IDLE");
        resolve();
        return;
      }

      synth.cancel();
      this.handlers.onState("SPEAKING");

      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.92;

        // Pick the best matching voice for the detected language.
        // Browsers load voices asynchronously, so we must query inside the callback.
        const voices = synth.getVoices();
        const voice = pickVoice(voices, lang);
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          if (!this.destroyed) this.handlers.onState("IDLE");
          resolve();
        };
        utterance.onerror = () => {
          if (!this.destroyed) this.handlers.onState("IDLE");
          resolve();
        };

        synth.speak(utterance);
      };

      // Voices may not be loaded yet on first call
      if (synth.getVoices().length > 0) {
        doSpeak();
      } else {
        let fired = false;
        const onReady = () => {
          if (fired) return;
          fired = true;
          synth.removeEventListener("voiceschanged", onReady);
          doSpeak();
        };
        synth.addEventListener("voiceschanged", onReady);
        // Safety fallback: if the event never fires, speak anyway after 1 s
        setTimeout(onReady, 1000);
      }
    });
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  /** Immediate abort — use for mode switch, key removal, and component unmount. */
  destroy() {
    this.destroyed = true;
    try {
      if (this.mediaRecorder?.state !== "inactive") this.mediaRecorder?.stop();
    } catch {
      // ignore
    }
    this.stopStream();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
  }
}
