import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { translateToCorporate } from "@/lib/translate.functions";
import { createGeminiLiveToken } from "@/lib/gemini.functions";
import type { VoiceSession, VoiceState } from "@/lib/voice-live";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily → Corporate Level 100 — Translator Bahasa Korporat" },
      {
        name: "description",
        content:
          "Ubah keluhan, slang, dan pesan blak-blakan jadi bahasa korporat yang diplomatis — via teks (DeepSeek) atau suara realtime (Gemini Live). Pakai API key sendiri.",
      },
      { property: "og:title", content: "Daily → Corporate Level 100" },
      {
        property: "og:description",
        content: "Biar maksud tersampaikan, tanpa bikin suasana memanas. Mode teks & suara.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MAX = 5000;
const DEEPSEEK_KEY = "deepseek_api_key";
const GEMINI_KEY = "gemini_api_key";

type Mode = "text" | "voice";

const EXAMPLES = [
  "bisa diem dulu ga jing, lagi w kerjain",
  "gak bisa sekarang, gw lagi banyak kerjaan",
  "data dari mereka salah semua",
  "ini ribet banget",
  "belum kelar, masih gw kerjain",
];

const VOICE_LABEL: Record<VoiceState, string> = {
  IDLE: "Press to speak",
  CONNECTING: "Menyambung...",
  LISTENING: "Listening...",
  THINKING: "Corporatifying...",
  SPEAKING: "Delivering the corporate version...",
  ERROR: "Corporate voice engine down",
};

function Index() {
  const translate = useServerFn(translateToCorporate);
  const mintToken = useServerFn(createGeminiLiveToken);

  const [mode, setMode] = useState<Mode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deepseekKey, setDeepseekKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [keysLoaded, setKeysLoaded] = useState(false);

  // Text mode
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Voice mode
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [voiceError, setVoiceError] = useState("");
  const [said, setSaid] = useState("");
  const [corporate, setCorporate] = useState("");
  const sessionRef = useRef<VoiceSession | null>(null);

  // Keys live only in sessionStorage: they vanish when the tab is closed.
  useEffect(() => {
    setDeepseekKey(sessionStorage.getItem(DEEPSEEK_KEY) ?? "");
    setGeminiKey(sessionStorage.getItem(GEMINI_KEY) ?? "");
    setKeysLoaded(true);
  }, []);

  useEffect(() => () => sessionRef.current?.stop(), []);

  function saveKey(which: Mode, value: string) {
    const key = value.trim();
    const storage = which === "text" ? DEEPSEEK_KEY : GEMINI_KEY;
    if (key.length < 10) return false;
    sessionStorage.setItem(storage, key);
    if (which === "text") setDeepseekKey(key);
    else setGeminiKey(key);
    return true;
  }

  function removeKey(which: Mode) {
    sessionStorage.removeItem(which === "text" ? DEEPSEEK_KEY : GEMINI_KEY);
    if (which === "text") {
      setDeepseekKey("");
      setOutput("");
    } else {
      endVoice();
      setGeminiKey("");
    }
  }

  async function run() {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res = await translate({ data: { text: value, apiKey: deepseekKey } });
      setOutput(res.result);
    } catch (err) {
      setError(
        err instanceof Error && err.message && !err.message.startsWith("Error")
          ? err.message
          : "Waduh, corporate engine lagi ngambek. Coba lagi beberapa saat.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function startVoice() {
    if (sessionRef.current || !geminiKey) return;
    setVoiceError("");
    setSaid("");
    setCorporate("");
    setVoiceState("CONNECTING");
    try {
      const { token } = await mintToken({ data: { apiKey: geminiKey } });
      const { VoiceSession } = await import("@/lib/voice-live");
      const session = new VoiceSession({
        onState: setVoiceState,
        onUserText: (t) => setSaid((prev) => prev + t),
        onCorporateText: (t) => setCorporate((prev) => prev + t),
        onError: setVoiceError,
      });
      sessionRef.current = session;
      await session.start(token);
    } catch (err) {
      sessionRef.current = null;
      setVoiceError(
        err instanceof Error && err.message && !err.message.startsWith("Error")
          ? err.message
          : "Gagal memulai sesi suara. Coba lagi.",
      );
      setVoiceState("ERROR");
    }
  }

  function endVoice() {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setVoiceState("IDLE");
  }

  function chooseMode(next: Mode) {
    if (mode === "voice" && next !== "voice") endVoice();
    setMode(next);
    const hasKey = next === "text" ? deepseekKey : geminiKey;
    if (!hasKey) setSettingsOpen(true);
  }

  const activeKeyMissing = mode === "text" ? !deepseekKey : !geminiKey;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="brutal-lg bg-yellow p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-4xl leading-[0.95] uppercase sm:text-6xl">
            Daily →<br />
            Corporate
            <br />
            <span className="bg-foreground px-2 text-background">Level 100</span>
          </h1>
          {mode && (
            <div className="flex flex-col items-end gap-2">
              <span className="brutal-sm bg-background px-3 py-1 text-xs font-bold uppercase">
                {mode === "text" ? "Text mode ●" : "Voice mode ●"}
              </span>
              <button
                onClick={() => setSettingsOpen(true)}
                className="brutal-sm brutal-press bg-card px-3 py-1 text-xs font-bold uppercase"
              >
                Settings
              </button>
              <button
                onClick={() => chooseMode(mode === "text" ? "voice" : "text")}
                className="brutal-sm brutal-press bg-blue px-3 py-1 text-xs font-bold uppercase text-background"
              >
                Ganti ke {mode === "text" ? "voice" : "text"}
              </button>
            </div>
          )}
        </div>
        <p className="mt-5 max-w-md text-base font-medium sm:text-lg">
          Biar maksud tersampaikan,
          <br />
          tanpa bikin suasana memanas.
        </p>
        <p className="mt-3 inline-block brutal-sm bg-pink px-3 py-1 text-sm font-bold uppercase text-background">
          Asal bos senang
        </p>
      </header>

      {keysLoaded && !mode && (
        <section className="brutal mt-8 bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase">How do you want to corporatify?</h2>
          <p className="mt-2 text-sm font-bold uppercase text-muted-foreground">
            Pick your corporate weapon
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => chooseMode("text")}
              className="brutal brutal-press bg-lime p-6 text-left"
            >
              <span className="font-display text-xl uppercase">Text mode</span>
              <span className="mt-3 block font-display text-sm uppercase">Type → corporate</span>
              <span className="mt-4 block text-xs font-bold uppercase">DeepSeek</span>
            </button>
            <button
              onClick={() => chooseMode("voice")}
              className="brutal brutal-press bg-pink p-6 text-left text-background"
            >
              <span className="font-display text-xl uppercase">Voice mode</span>
              <span className="mt-3 block font-display text-sm uppercase">Speak → corporate</span>
              <span className="mt-4 block text-xs font-bold uppercase">Gemini Live</span>
            </button>
          </div>
        </section>
      )}

      {settingsOpen && (
        <section className="brutal mt-8 bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl uppercase">AI providers</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="brutal-sm brutal-press bg-orange px-3 py-1 text-xs font-bold uppercase"
            >
              Tutup
            </button>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            API key kamu hanya disimpan di tab browser ini (session) dan tidak pernah disimpan oleh
            aplikasi. Tutup tab → harus input lagi. Perlakukan key sebagai kredensial sensitif.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <ProviderCard
              name="DeepSeek"
              hint="platform.deepseek.com → API keys"
              placeholder="sk-xxxxxxxxxxxxxxxx"
              connected={Boolean(deepseekKey)}
              onSave={(v) => saveKey("text", v)}
              onRemove={() => removeKey("text")}
            />
            <ProviderCard
              name="Gemini"
              hint="aistudio.google.com → API keys"
              placeholder="AIza..."
              connected={Boolean(geminiKey)}
              onSave={(v) => saveKey("voice", v)}
              onRemove={() => removeKey("voice")}
            />
          </div>
        </section>
      )}

      {mode === "text" && !activeKeyMissing && (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="brutal bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm uppercase">Bahasa sehari-hari</h2>
                <button
                  onClick={() => {
                    setText("");
                    setOutput("");
                    setError("");
                    taRef.current?.focus();
                  }}
                  className="brutal-sm bg-orange px-2 py-1 text-[11px] font-bold uppercase"
                >
                  Clear
                </button>
              </div>
              <textarea
                ref={taRef}
                value={text}
                maxLength={MAX}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
                }}
                placeholder={'Contoh:\n"bisa diem dulu ga jing, lagi w kerjain"'}
                className="brutal-sm mt-4 h-56 w-full resize-y bg-background p-3 font-medium outline-none focus:bg-yellow/40"
              />
              <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase text-muted-foreground">
                <span>Ctrl / ⌘ + Enter</span>
                <span>
                  {text.length}/{MAX}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    className="brutal-sm bg-secondary px-2 py-1 text-[11px] font-medium"
                  >
                    {ex.length > 28 ? `${ex.slice(0, 28)}…` : ex}
                  </button>
                ))}
              </div>
            </section>

            <section className="brutal bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm uppercase">Corporate level 100</h2>
                {output && (
                  <button
                    onClick={copy}
                    className="brutal-sm brutal-press bg-lime px-2 py-1 text-[11px] font-bold uppercase"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
              <div className="brutal-sm mt-4 min-h-56 bg-background p-3">
                {loading ? (
                  <p className="animate-pulse font-display text-sm uppercase">
                    Membuat bos senang...
                  </p>
                ) : error ? (
                  <p className="font-bold text-destructive">{error}</p>
                ) : output ? (
                  <p className="leading-relaxed font-medium whitespace-pre-wrap">{output}</p>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    Hasil korporat kamu akan muncul di sini.
                  </p>
                )}
              </div>
            </section>
          </div>

          <button
            onClick={run}
            disabled={loading || !text.trim()}
            className="brutal-lg brutal-press mt-8 w-full bg-pink px-6 py-6 font-display text-xl uppercase text-background disabled:opacity-50 sm:text-2xl"
          >
            {loading ? "Corporatifying..." : "Make it corporate →"}
          </button>
        </>
      )}

      {mode === "voice" && !activeKeyMissing && (
        <section className="brutal mt-8 bg-card p-6 text-center sm:p-10">
          <div
            className={`brutal-lg mx-auto flex size-32 items-center justify-center text-5xl ${
              voiceState === "LISTENING"
                ? "animate-pulse bg-lime"
                : voiceState === "SPEAKING"
                  ? "bg-blue"
                  : voiceState === "ERROR"
                    ? "bg-destructive"
                    : "bg-yellow"
            }`}
          >
            🎙
          </div>
          <p className="mt-6 font-display text-lg uppercase">{VOICE_LABEL[voiceState]}</p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Ngomong aja sesukanya — suaranya bakal dibalikin versi korporat.
          </p>

          {voiceError && (
            <p className="brutal-sm mt-5 inline-block bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground">
              {voiceError}
            </p>
          )}

          <div className="mt-7">
            {voiceState === "IDLE" || voiceState === "ERROR" ? (
              <button
                onClick={startVoice}
                className="brutal brutal-press bg-pink px-8 py-4 font-display text-lg uppercase text-background"
              >
                Start session
              </button>
            ) : (
              <button
                onClick={endVoice}
                className="brutal brutal-press bg-card px-8 py-4 font-display text-lg uppercase"
              >
                End session
              </button>
            )}
          </div>

          {(said || corporate) && (
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
              <div className="brutal-sm bg-background p-4">
                <h3 className="font-display text-xs uppercase">You said</h3>
                <p className="mt-2 font-medium">{said || "—"}</p>
              </div>
              <div className="brutal-sm bg-background p-4">
                <h3 className="font-display text-xs uppercase">Corporate</h3>
                <p className="mt-2 font-medium">{corporate || "—"}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {mode && activeKeyMissing && !settingsOpen && (
        <section className="brutal mt-8 bg-card p-6">
          <p className="font-display text-sm uppercase">
            Mode ini butuh API key {mode === "text" ? "DeepSeek" : "Gemini"}.
          </p>
          <button
            onClick={() => setSettingsOpen(true)}
            className="brutal-sm brutal-press mt-4 bg-blue px-4 py-2 font-display text-sm uppercase text-background"
          >
            Masukin key
          </button>
        </section>
      )}

      <footer className="mt-10 text-center text-xs font-bold uppercase text-muted-foreground">
        Bring your own key · nothing stored on the server
      </footer>
    </main>
  );
}

function ProviderCard({
  name,
  hint,
  placeholder,
  connected,
  onSave,
  onRemove,
}: {
  name: string;
  hint: string;
  placeholder: string;
  connected: boolean;
  onSave: (value: string) => boolean;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="brutal-sm bg-background p-4">
      <h3 className="font-display text-sm uppercase">{name}</h3>
      <p className="mt-1 text-xs font-bold uppercase">
        {connected ? "● Connected" : "○ Not configured"}
      </p>

      {connected && !editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(true)}
            className="brutal-sm brutal-press bg-card px-3 py-1 text-[11px] font-bold uppercase"
          >
            Change key
          </button>
          <button
            onClick={onRemove}
            className="brutal-sm brutal-press bg-destructive px-3 py-1 text-[11px] font-bold uppercase text-destructive-foreground"
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!onSave(draft)) {
              setErr("Key-nya kelihatan belum lengkap.");
              return;
            }
            setDraft("");
            setErr("");
            setEditing(false);
          }}
          className="mt-3 flex flex-col gap-2"
        >
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="brutal-sm w-full bg-card px-3 py-2 text-sm font-medium outline-none focus:bg-lime"
          />
          <button
            type="submit"
            className="brutal-sm brutal-press bg-blue px-3 py-2 font-display text-xs uppercase text-background"
          >
            Simpan key
          </button>
          {err && <span className="text-xs font-bold text-destructive">{err}</span>}
        </form>
      )}
      <p className="mt-3 text-[11px] font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}
