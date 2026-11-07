"use server";

import { createQuoteLead, submitTestimonial } from "@/server/services/leads";

export async function requestQuoteAction(lead: unknown, contact: unknown) {
  const r = await createQuoteLead(lead, contact);
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
}

export async function submitTestimonialAction(input: unknown) {
  return submitTestimonial(input);
}
