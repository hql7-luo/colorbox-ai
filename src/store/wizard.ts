import { create } from "zustand";
import type { Confidence } from "@/lib/order-schema";
import type { ReviewResult } from "@/lib/review";
import type { ClientFile, ClientOrder } from "@/types";
import type { TranslationKey } from "@/i18n";

type WizardState = {
  step: number;
  files: ClientFile[];
  confidence: Record<string, Confidence>;
  notice: TranslationKey | "";
  review: ReviewResult | null;
  savedOrder: ClientOrder | null;
  setStep: (step: number) => void;
  setFiles: (files: ClientFile[]) => void;
  setConfidence: (confidence: Record<string, Confidence>) => void;
  setNotice: (notice: TranslationKey | "") => void;
  setReview: (review: ReviewResult | null) => void;
  setSavedOrder: (order: ClientOrder | null) => void;
  reset: () => void;
};

export const useWizardStore = create<WizardState>((set) => ({
  step: 1,
  files: [],
  confidence: {},
  notice: "",
  review: null,
  savedOrder: null,
  setStep: (step) => set({ step }),
  setFiles: (files) => set({ files }),
  setConfidence: (confidence) => set({ confidence }),
  setNotice: (notice) => set({ notice }),
  setReview: (review) => set({ review }),
  setSavedOrder: (savedOrder) => set({ savedOrder }),
  reset: () =>
    set({ step: 1, files: [], confidence: {}, notice: "", review: null, savedOrder: null }),
}));
