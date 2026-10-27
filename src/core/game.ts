import type { Interest, InterestVector, Pace, TravelerProfile } from "./types";

/**
 * «¿Esto o aquello?»: elecciones rápidas que hacen el cuestionario más entretenido
 * y, a la vez, afinan intereses reales del perfil (no son decorativas).
 */
export interface ThisOrThat {
  id: string;
  a: { emoji: string; label: string; interests?: InterestVector; pace?: Pace };
  b: { emoji: string; label: string; interests?: InterestVector; pace?: Pace };
}

export const THIS_OR_THAT: ThisOrThat[] = [
  { id: "tot_scene", a: { emoji: "🏖️", label: "Playa", interests: { beach: 0.9 } }, b: { emoji: "🏔️", label: "Montaña", interests: { nature: 0.9 } } },
  { id: "tot_day", a: { emoji: "🏛️", label: "Museos e historia", interests: { culture: 0.8, history: 0.8 } }, b: { emoji: "🛍️", label: "Paseo y compras", interests: { shopping: 0.8 } } },
  { id: "tot_night", a: { emoji: "🍷", label: "Cena tranquila", interests: { gastronomy: 0.7, romance: 0.5 } }, b: { emoji: "🎉", label: "Salir de noche", interests: { nightlife: 0.9 } } },
  { id: "tot_pace", a: { emoji: "🐢", label: "Ritmo lento", pace: "relaxed" }, b: { emoji: "⚡", label: "Aprovechar al máximo", pace: "intense" } },
  { id: "tot_style", a: { emoji: "🍹", label: "Hotel con todo resuelto", interests: { relax: 0.8 } }, b: { emoji: "🧭", label: "Explorar por mi cuenta", interests: { adventure: 0.6, offbeat: 0.6 } } },
  { id: "tot_places", a: { emoji: "📸", label: "Lugares famosos", interests: { iconic: 0.9 } }, b: { emoji: "🗝️", label: "Rincones secretos", interests: { offbeat: 0.9 } } },
];

/** Aplica las elecciones (a, b o "both") a un vector de intereses. Devuelve el ritmo elegido, si lo hay. */
export function applyThisOrThat(extra: Record<string, string | string[]>, bump: (i: Interest, v: number) => void): Pace | null {
  let pace: Pace | null = null;
  for (const q of THIS_OR_THAT) {
    const v = extra[q.id];
    if (v !== "a" && v !== "b" && v !== "both") continue;
    const sides = v === "both" ? [q.a, q.b] : [v === "a" ? q.a : q.b];
    for (const side of sides) {
      for (const [k, w] of Object.entries(side.interests ?? {})) bump(k as Interest, (w as number) * (v === "both" ? 0.7 : 1));
      if (side.pace && v !== "both") pace = side.pace;
    }
  }
  return pace;
}

export interface Persona {
  emoji: string;
  name: string;
  tagline: string;
  traits: { label: string; value: number }[];
}

/** Perfil viajero para mostrarle al cliente: un resumen divertido y fiel a sus respuestas. */
export function travelerPersona(p: TravelerProfile): Persona {
  const i = (k: Interest) => p.interests[k] ?? 0;
  const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);
  const traits = [
    { label: "Descanso", value: pct(Math.max(i("relax"), i("beach") * 0.8, p.pace === "relaxed" ? 0.8 : 0)) },
    { label: "Cultura", value: pct(Math.max(i("culture"), i("history"), i("architecture"))) },
    { label: "Aventura", value: pct(Math.max(i("adventure"), i("nature") * 0.9, i("offbeat") * 0.8)) },
    { label: "Sabores", value: pct(Math.max(i("gastronomy"), i("wine"))) },
    { label: "Movida", value: pct(Math.max(i("nightlife"), i("shopping") * 0.8, p.pace === "intense" ? 0.7 : 0)) },
  ];
  const top = traits.slice().sort((a, b) => b.value - a.value)[0];
  const second = traits.slice().sort((a, b) => b.value - a.value)[1];
  const PERSONAS: Record<string, { emoji: string; name: string; tagline: string }> = {
    Descanso: { emoji: "🌴", name: "Relajado de playa", tagline: "Tu viaje ideal empieza con los pies en la arena y sin despertador." },
    Cultura: { emoji: "🏛️", name: "Explorador cultural", tagline: "Te emociona caminar por la historia y descubrir cada rincón con sentido." },
    Aventura: { emoji: "🧗", name: "Espíritu aventurero", tagline: "Paisajes enormes, caminos nuevos y algo de adrenalina." },
    Sabores: { emoji: "🍷", name: "Viajero de sabores", tagline: "Para vos, un destino se recuerda por lo que comiste y brindaste." },
    Movida: { emoji: "🌃", name: "Alma urbana", tagline: "Ciudades vibrantes, compras y noches largas." },
  };
  let persona = PERSONAS[top.label];
  if (p.kids.length || p.partyType === "family") persona = { emoji: "🎈", name: "Familia viajera", tagline: "Planes que disfrutan grandes y chicos, sin correr de un lado a otro." };
  else if (i("romance") >= 0.8) persona = { emoji: "💞", name: "Romántico empedernido", tagline: "Atardeceres, buena mesa y lugares para recordar de a dos." };
  else if (i("themeparks") >= 0.8) persona = { emoji: "🎢", name: "Fan de los parques", tagline: "Montañas rusas, shows y magia de la mañana a la noche." };
  else if (top.value === 0) persona = { emoji: "🧭", name: "Curioso por descubrir", tagline: "Todavía no tenés destino, y eso es parte de la aventura." };
  const name = top.value > 0 && second.value >= top.value - 10 && second.value > 40 && persona === PERSONAS[top.label] ? `${persona.name} con toque de ${second.label.toLowerCase()}` : persona.name;
  return { emoji: persona.emoji, name, tagline: persona.tagline, traits };
}
