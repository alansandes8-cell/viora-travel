"use server";

import type { IntakeAnswers } from "@/core/types";
import { saveDraft, smartQuestionsFor, startNewTrip, submitIntake } from "@/server/services/client-flow";

export async function saveDraftAction(answers: Partial<IntakeAnswers>, step: number) {
  return saveDraft(answers, step);
}

export async function smartQuestionsAction(answers: unknown) {
  return smartQuestionsFor(answers);
}

export async function submitAction(answers: unknown, budget: unknown) {
  return submitIntake(answers, budget);
}

/** Empieza un viaje nuevo (el anterior queda en «Mis viajes»). No redirige: el cuestionario se limpia en el navegador. */
export async function newTripDraftAction() {
  await startNewTrip();
}
