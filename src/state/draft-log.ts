import { create } from 'zustand';
import type { SubScores, PizzaTags } from '../db/types';
import type { SendFriend } from '../constants/enums';

type DraftLogState = {
  photoUri: string | null;
  moneyShot: number;
  subScores: SubScores;
  sendFriend: SendFriend | null;
  tags: PizzaTags;
  spotId: string | null;
  spotName: string | null;
  notes: string;

  setPhoto: (uri: string | null) => void;
  setMoneyShot: (value: number) => void;
  setSubScore: (key: keyof SubScores, value: number | null) => void;
  setSendFriend: (value: SendFriend | null) => void;
  setTag: <K extends keyof PizzaTags>(key: K, value: PizzaTags[K]) => void;
  setSpot: (id: string | null, name: string | null) => void;
  setNotes: (text: string) => void;
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

export const useDraftLogStore = create<DraftLogState>((set) => ({
  photoUri: null,
  moneyShot: 50,
  subScores: { ...initialSubScores },
  sendFriend: null,
  tags: { ...initialTags },
  spotId: null,
  spotName: null,
  notes: '',

  setPhoto: (uri) => set({ photoUri: uri }),
  setMoneyShot: (value) => set({ moneyShot: value }),
  setSubScore: (key, value) =>
    set((s) => ({ subScores: { ...s.subScores, [key]: value } })),
  setSendFriend: (value) => set({ sendFriend: value }),
  setTag: (key, value) => set((s) => ({ tags: { ...s.tags, [key]: value } })),
  setSpot: (id, name) => set({ spotId: id, spotName: name }),
  setNotes: (text) => set({ notes: text }),
  reset: () =>
    set({
      photoUri: null,
      moneyShot: 50,
      subScores: { ...initialSubScores },
      sendFriend: null,
      tags: { ...initialTags },
      spotId: null,
      spotName: null,
      notes: '',
    }),
}));
