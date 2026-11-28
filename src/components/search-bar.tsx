"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PHONE_TEL } from "@/lib/shop";
import type { SuggestHit } from "@/lib/search-match";

const RECENT = "pb_recent_q";

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function remember(query: string) {
  const next = [query, ...readRecent().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT, JSON.stringify(next));
}

export function SearchBar({
  initial = "",
  onValue,
  tone = "desktop",
}: {
  initial?: string;
  onValue?: (value: string) => void;
  tone?: "desktop" | "mobile";
}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(initial);
  const [hits, setHits] = useState<SuggestHit[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [mic, setMic] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const recognition = useRef<InstanceType<SpeechCtor> | null>(null);
  const heard = useRef("");

  useEffect(() => {
    const show = setTimeout(() => {
      setMic(!!speechCtor());
      setRecent(readRecent());
    }, 0);
    return () => clearTimeout(show);
  }, []);

  useEffect(() => {
    if (value.trim().length < 2) {
      const clear = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(clear);
    }
    const handle = setTimeout(() => {
      fetch(`/api/store/suggest?q=${encodeURIComponent(value.trim())}`)
        .then((res) => (res.ok ? res.json() : { hits: [] }))
        .then((data: { hits?: SuggestHit[] }) => setHits(data.hits ?? []))
        .catch(() => setHits([]));
    }, 160);
    return () => clearTimeout(handle);
  }, [value]);

  function change(next: string) {
    setValue(next);
    onValue?.(next);
    setOpen(true);
  }

  function go(query: string) {
    const q = query.trim();
    if (!q) return;
    remember(q);
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  function listen() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const said = Array.from(event.results).map((row) => row[0].transcript).join(" ").trim();
      if (!said) return;
      heard.current = said;
      change(said);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (heard.current) go(heard.current);
    };
    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  const showRecent = open && value.trim().length < 2 && recent.length > 0;
  const showHits = open && value.trim().length >= 2;
  const wa = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, do you have ${value.trim()}?`)}`;
  const field = tone === "desktop"
    ? "min-w-0 flex-1 bg-transparent px-5 text-[15px] text-[#0c1222] outline-none"
    : "min-w-0 flex-1 bg-transparent text-[15px] text-[#0c1222] outline-none";

  return (
    <div ref={box} className={tone === "desktop" ? "relative mx-auto min-w-0 max-w-3xl flex-1" : "relative mt-2"}>
      <form
        role="search"
        className={tone === "desktop" ? "flex h-12 overflow-hidden rounded-full border border-[#153a7a]/20 bg-white shadow-[0_1px_2px_rgba(21,58,122,0.06)]" : "flex h-11 items-center gap-1 rounded-[10px] bg-white px-3"}
        onSubmit={(event) => {
          event.preventDefault();
          go(value);
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-q`}>Search the shop</label>
        <input
          id={`${listId}-q`}
          value={value}
          placeholder={listening ? "Bol kar search karein..." : "Search for products (e.g. Pen, Diary, Pouch...)"}
          className={field}
          autoComplete="off"
          role="combobox"
          aria-expanded={showHits || showRecent}
          aria-controls={listId}
          onChange={(event) => change(event.target.value)}
          onFocus={() => setOpen(true)}
        />
        {mic && (
          <button type="button" className={`mr-1 grid h-9 w-9 place-items-center rounded-full ${listening ? "animate-pulse bg-[#e36b5a] text-white" : "text-[#153a7a]"}`} aria-pressed={listening} aria-label={listening ? "Stop listening" : "Search by voice"} onClick={listen}>
            <Mic />
          </button>
        )}
        {mic && (
          <button type="button" className="mr-1 text-[11px] font-extrabold text-[#153a7a]" aria-label={lang === "en-IN" ? "Voice language English. Switch to Hindi." : "Voice language Hindi. Switch to English."} onClick={() => setLang((current) => (current === "en-IN" ? "hi-IN" : "en-IN"))}>
            {lang === "en-IN" ? "EN" : "हि"}
          </button>
        )}
        {tone === "desktop" && <button type="submit" className="m-1 rounded-full bg-[#ecc233] px-6 text-sm font-extrabold text-[#0a1628]">Search</button>}
      </form>
      {(showRecent || showHits) && (
        <div id={listId} className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-[0_12px_32px_rgba(12,18,34,0.12)]">
          {showRecent && recent.map((item) => (
            <button key={item} type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-[#f4f6fa]" onClick={() => (change(item), go(item))}>{item}</button>
          ))}
          {showHits && hits.map((hit) => (
            <a key={hit.href + hit.label} href={hit.href} className="flex items-center gap-3 px-3 py-2 no-underline hover:bg-[#f4f6fa]" onClick={() => setOpen(false)}>
              {hit.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hit.image} alt="" width={40} height={40} className="h-10 w-10 rounded-[8px] bg-[#f3f5f8] object-contain" />
              ) : <span className="h-10 w-10 rounded-[8px] bg-[#f3f5f8]" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#0c1222]">{hit.label}</span>
                <span className="block text-xs text-[#5a6a82]">{hit.kind === "category" ? "Category" : hit.detail}</span>
              </span>
              {hit.price ? <span className="text-sm font-extrabold text-[#153a7a]">{hit.price}</span> : null}
            </a>
          ))}
          {showHits && hits.length === 0 && (
            <div className="px-4 py-3 text-sm">
              <p>Nothing in the shop matches “{value.trim()}”.</p>
              <a className="mt-1 inline-block font-bold text-[#153a7a]" href={wa}>Ask on WhatsApp</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Mic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.7V20H9v2h6v-2h-2v-2.3A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}
