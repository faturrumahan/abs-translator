// Browser-only Gemini Live session: mic capture -> Live API -> speaker.
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";

import { GEMINI_LIVE_MODEL, VOICE_SYSTEM_PROMPT } from "./prompts";

export type VoiceState = "IDLE" | "CONNECTING" | "LISTENING" | "THINKING" | "SPEAKING" | "ERROR";

type Handlers = {
  onState: (state: VoiceState) => void;
  onUserText: (text: string) => void;
  onCorporateText: (text: string) => void;
  onError: (message: string) => void;
};

const IN_RATE = 16000;
const OUT_RATE = 24000;

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function floatToPcm16(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

function downsample(input: Float32Array, from: number, to: number) {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i += 1) out[i] = input[Math.floor(i * ratio)];
  return out;
}

export class VoiceSession {
  private session: Session | null = null;
  private stream: MediaStream | null = null;
  private inCtx: AudioContext | null = null;
  private outCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private playHead = 0;
  private sources: AudioBufferSourceNode[] = [];
  private closed = false;

  constructor(private handlers: Handlers) {}

  async start(token: string) {
    this.handlers.onState("CONNECTING");

    // Microphone first: no session cost if permission is denied.
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      this.handlers.onError("Akses mikrofon ditolak. Izinkan mic dulu ya.");
      this.handlers.onState("ERROR");
      return;
    }

    const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

    try {
      this.session = await ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: VOICE_SYSTEM_PROMPT,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => this.handlers.onState("LISTENING"),
          onmessage: (message) => this.handleMessage(message),
          onerror: () => {
            if (this.closed) return;
            this.handlers.onError("Corporate voice engine down. Coba mulai sesi lagi.");
            this.handlers.onState("ERROR");
          },
          onclose: () => {
            if (!this.closed) this.handlers.onState("IDLE");
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      this.handlers.onError(
        /api key|401|403|permission|invalid/i.test(message)
          ? "API key Gemini kamu ditolak Google. Cek lagi ya."
          : "Gagal menyambung ke corporate voice engine. Coba lagi.",
      );
      this.handlers.onState("ERROR");
      this.stopMic();
      return;
    }

    this.startMic();
  }

  private startMic() {
    if (!this.stream) return;
    const ctx = new AudioContext();
    this.inCtx = ctx;
    this.source = ctx.createMediaStreamSource(this.stream);
    this.processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (!this.session || this.closed) return;
      const chunk = downsample(
        new Float32Array(event.inputBuffer.getChannelData(0)),
        ctx.sampleRate,
        IN_RATE,
      );
      this.session.sendRealtimeInput({
        audio: {
          data: encodeBase64(floatToPcm16(chunk)),
          mimeType: `audio/pcm;rate=${IN_RATE}`,
        },
      });
    };
    this.source.connect(this.processor);
    this.processor.connect(ctx.destination);
  }

  private handleMessage(message: LiveServerMessage) {
    const content = message.serverContent;
    if (content?.inputTranscription?.text) {
      this.handlers.onUserText(content.inputTranscription.text);
      this.handlers.onState("THINKING");
    }
    if (content?.outputTranscription?.text) {
      this.handlers.onCorporateText(content.outputTranscription.text);
    }
    if (content?.interrupted) {
      this.stopPlayback();
      this.handlers.onState("LISTENING");
    }
    for (const part of content?.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data;
      if (data) {
        this.handlers.onState("SPEAKING");
        void this.play(data);
      }
    }
    if (content?.turnComplete) {
      this.handlers.onState("LISTENING");
    }
  }

  private async play(base64: string) {
    if (!this.outCtx) this.outCtx = new AudioContext({ sampleRate: OUT_RATE });
    const ctx = this.outCtx;
    if (ctx.state === "suspended") await ctx.resume();

    const bytes = decodeBase64(base64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = ctx.createBuffer(1, pcm.length, OUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i] / 0x8000;

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    this.playHead = Math.max(this.playHead, ctx.currentTime);
    node.start(this.playHead);
    this.playHead += buffer.duration;
    this.sources.push(node);
    node.onended = () => {
      this.sources = this.sources.filter((s) => s !== node);
    };
  }

  private stopPlayback() {
    for (const node of this.sources) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    this.playHead = 0;
  }

  private stopMic() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.inCtx?.close();
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.inCtx = null;
  }

  stop() {
    this.closed = true;
    this.stopPlayback();
    this.stopMic();
    void this.outCtx?.close();
    this.outCtx = null;
    try {
      this.session?.close();
    } catch {
      // session already closed
    }
    this.session = null;
    this.handlers.onState("IDLE");
  }
}
