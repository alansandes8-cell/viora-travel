"use client";

import { useState, useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button, Notice, inputClass } from "@/components/ui";

const EXAMPLES = ["Quiero menos ciudades", "Prefiero más días de playa", "Quiero un ritmo más tranquilo", "Prefiero hoteles céntricos", "No quiero alquilar auto"];

export function ChangeBox({ action }: { action: (text: string) => Promise<{ ok: boolean; message: string; explanation?: string[] }> }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; explanation?: string[] } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setText(e)} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/30">
            {e}
          </button>
        ))}
      </div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          start(async () => setResult(await action(text)));
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="change" className="sr-only">
          ¿Qué te gustaría cambiar?
        </label>
        <input id="change" className={inputClass} value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="Ej.: quiero cambiar Roma por Florencia" />
        <Button disabled={pending || text.trim().length < 4}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Aplicar cambio
        </Button>
      </form>
      {result && (
        <Notice tone={result.ok ? "success" : "danger"}>
          <p className="font-semibold">{result.message}</p>
          {result.explanation?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {result.explanation.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
        </Notice>
      )}
    </div>
  );
}
