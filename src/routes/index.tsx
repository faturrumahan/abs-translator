import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { translateToCorporate } from "@/lib/translate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily → Corporate Level 100 — Translator Bahasa Korporat" },
      {
        name: "description",
        content:
          "Ubah keluhan, slang, dan pesan blak-blakan jadi bahasa korporat yang diplomatis. Pakai API key DeepSeek milikmu sendiri.",
      },
      { property: "og:title", content: "Daily → Corporate Level 100" },
      {
        property: "og:description",
        content: "Biar maksud tersampaikan, tanpa bikin suasana memanas.",
      },
    ],
  }),
  component: Index,
});

const MAX = 5000;
const KEY_STORAGE = "deepseek_api_key";

const EXAMPLES = [
  "bisa diem dulu ga jing, lagi w kerjain",
  "gak bisa sekarang, gw lagi banyak kerjaan",
  "data dari mereka salah semua",
  "ini ribet banget",
  "belum kelar, masih gw kerjain",
];

function Index() {
  const translate = useServerFn(translateToCorporate);
  const [apiKey, setApiKey] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Key lives only in sessionStorage: it vanishes when the tab is closed.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) {
      setApiKey(saved);
      setKeyReady(true);
    }
  }, []);

  function saveKey(e: React.FormEvent) {
    e.preventDefault();
    const k = keyDraft.trim();
    if (k.length < 10) {
      setError("API key-nya kelihatan belum lengkap.");
      return;
    }
    sessionStorage.setItem(KEY_STORAGE, k);
    setApiKey(k);
    setKeyReady(true);
    setKeyDraft("");
    setError("");
  }

  function forgetKey() {
    sessionStorage.removeItem(KEY_STORAGE);
    setApiKey("");
    setKeyReady(false);
    setOutput("");
  }

  async function run() {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res = await translate({ data: { text: value, apiKey } });
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="brutal-lg bg-yellow p-6 sm:p-10">
        <h1 className="font-display text-4xl leading-[0.95] uppercase sm:text-6xl">
          Daily →<br />
          Corporate
          <br />
          <span className="bg-foreground px-2 text-background">Level 100</span>
        </h1>
        <p className="mt-5 max-w-md text-base font-medium sm:text-lg">
          Biar maksud tersampaikan,
          <br />
          tanpa bikin suasana memanas.
        </p>
        <p className="mt-3 inline-block brutal-sm bg-pink px-3 py-1 text-sm font-bold uppercase text-background">
          Asal bos senang
        </p>
      </header>

      {!keyReady ? (
        <section className="brutal mt-8 bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl uppercase">Masukin API key DeepSeek kamu</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Key kamu cuma disimpan di tab ini (session), tidak pernah disimpan di server. Tutup tab
            → harus input lagi.
          </p>
          <form onSubmit={saveKey} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              autoComplete="off"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="brutal-sm w-full bg-background px-4 py-3 font-medium outline-none focus:bg-lime"
            />
            <button
              type="submit"
              className="brutal-sm brutal-press bg-blue px-6 py-3 font-display text-sm uppercase text-background"
            >
              Simpan key
            </button>
          </form>
          {error && (
            <p className="brutal-sm mt-4 bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Belum punya key? Ambil di platform.deepseek.com → API keys.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="brutal-sm bg-lime px-3 py-1 text-xs font-bold uppercase">
              Key aktif di tab ini
            </span>
            <button
              onClick={forgetKey}
              className="brutal-sm brutal-press bg-card px-3 py-1 text-xs font-bold uppercase"
            >
              Ganti key
            </button>
          </div>

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

      <footer className="mt-10 text-center text-xs font-bold uppercase text-muted-foreground">
        Bring your own key · nothing stored on the server
      </footer>
    </main>
  );
}
