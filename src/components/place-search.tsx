"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui";

/**
 * Buscador con autocompletado (aeropuertos del mundo, o ciudades y países).
 * Accesible con teclado: ↑ ↓ para moverse, Enter para elegir, Escape para cerrar.
 */
export function PlaceSearch<T>({
  tipo,
  id,
  placeholder,
  onPick,
  render,
  keyOf,
  onEnterText,
  className,
  clearOnPick = true,
}: {
  tipo: "aeropuertos" | "lugares";
  id?: string;
  placeholder?: string;
  onPick: (item: T) => void;
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  /** Enter con texto que no coincide con ninguna opción (p. ej. agregar tal cual). */
  onEnterText?: (text: string) => void;
  className?: string;
  clearOnPick?: boolean;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-opciones`;
  const [text, setText] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = text.trim();
    if (q.length < 2) return;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lugares?tipo=${tipo}&q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as T[];
        setItems(data);
        setActive(0);
        setSearched(q);
        setOpen(true);
      } catch {
        setItems([]);
      }
    }, 180);
  }, [text, tipo]);

  const pick = (item: T) => {
    onPick(item);
    setOpen(false);
    setItems([]);
    if (clearOnPick) setText("");
  };
  const visible = open && text.trim().length >= 2;

  return (
    <div className={cx("relative", className)}>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && items[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="w-full min-w-40 bg-transparent px-1 py-1.5 text-[15px] outline-none"
        value={text}
        maxLength={80}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim().length < 2) setOpen(false);
        }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(items.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" || (e.key === "," && onEnterText)) {
            e.preventDefault();
            if (visible && items[active] && searched === text.trim()) pick(items[active]);
            else if (onEnterText && text.trim()) {
              onEnterText(text.trim());
              setText("");
              setOpen(false);
            }
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {visible && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-white py-1 shadow-lift">
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{onEnterText ? "Sin coincidencias: presioná Enter para agregarlo igual." : "No encontramos coincidencias."}</li>
          ) : (
            items.map((it, i) => (
              <li
                key={keyOf(it)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(it);
                }}
                onMouseEnter={() => setActive(i)}
                className={cx("cursor-pointer px-3 py-2 text-sm", i === active ? "bg-teal-brand/10" : "")}
              >
                {render(it)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
