import { create } from 'zustand';
import type { SubScores, PizzaTags } from '../db/types';
import type { SendFriend } from '../constants/enums';
import { liftSubject, type LiftResult } from '../lib/subject-lift';

/** Subject lift for the current photo: runs while the rate screen opens. */
export type LiftState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'done'; result: LiftResult | null };

type DraftLogState = {
  photoUri: string | null;
  lift: LiftState;
  moneyShot: number;
  subScores: SubScores;
  sendFriend: SendFriend | null;
  tags: PizzaTags;
  spotId: string | null;
  spotName: string | null;
  notes: string;
  lat: number | null;
  lng: number | null;

  setPhoto: (uri: string | null) => void;
  startLift: (uri: string) => Promise<void>;
  setMoneyShot: (value: number) => void;
  setSubScore: (key: keyof SubScores, value: number | null) => void;
  setSendFriend: (value: SendFriend | null) => void;
  setTag: <K extends keyof PizzaTags>(key: K, value: PizzaTags[K]) => void;
  setSpot: (id: string | null, name: string | null) => void;
  setNotes: (text: string) => void;
  setCoords: (lat: number | null, lng: number | null) => void;
  reset: () => void;
};

const initialSubScores: SubScores = {
  crust: null,
  charBake: null,
  sauceCheese: null,
  toppings: null,
  vibes: null,
  service: null,
  value: null,
};

const initialTags: PizzaTags = {
  style: null,
  format: null,
  toppings: [],
  priceTier: null,
  context: null,
};

export const useDraftLogStore = create<DraftLogState>((set, get) => ({
  photoUri: null,
  lift: { status: 'idle' },
  moneyShot: 50,
  subScores: { ...initialSubScores },
  sendFriend: null,
  tags: { ...initialTags },
  spotId: null,
  spotName: null,
  notes: '',
  lat: null,
  lng: null,

  setPhoto: (uri) => set({ photoUri: uri, lift: { status: 'idle' } }),
  startLift: async (uri) => {
    set({ lift: { status: 'pending' } });
    const result = await liftSubject(uri);
    // A retake while Vision was running makes this result stale.
    if (get().photoUri !== uri) return;
    set({ lift: { status: 'done', result } });
  },
  setMoneyShot: (value) => set({ moneyShot: value }),
  setSubScore: (key, value) =>
    set((s) => ({ subScores: { ...s.subScores, [key]: value } })),
  setSendFriend: (value) => set({ sendFriend: value }),
  setTag: (key, value) => set((s) => ({ tags: { ...s.tags, [key]: value } })),
  setSpot: (id, name) => set({ spotId: id, spotName: name }),
  setNotes: (text) => set({ notes: text }),
  setCoords: (lat, lng) => set({ lat, lng }),
  reset: () =>
    set({
      photoUri: null,
      lift: { status: 'idle' },
      moneyShot: 50,
      subScores: { ...initialSubScores },
      sendFriend: null,
      tags: { ...initialTags },
      spotId: null,
      spotName: null,
      notes: '',
      lat: null,
      lng: null,
    }),
}));

// Dev hook: the iOS simulator cannot run Vision's foreground mask, so a
// precomputed lift result can be injected from the debugger while iterating
// on the slice-lift animation. Never present in release builds.
if (__DEV__) {
  (globalThis as { __draftLog?: typeof useDraftLogStore }).__draftLog = useDraftLogStore;
}
