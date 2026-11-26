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
  /** Edit only: the photo the log had when the edit started. */
  seedPhotoUri: string | null;
  /** Edit only: the photo set aside while the user takes a new one. */
  replaced: { photoUri: string | null; lift: LiftState } | null;
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
  /** Start an edit with the log's own photo. */
  seedPhoto: (uri: string | null) => void;
  /** Set the current photo aside and show the camera again. */
  beginReplace: () => void;
  /** Bring back the photo that was set aside. */
  cancelReplace: () => void;
  /** Keep the new photo and forget the one set aside. */
  commitReplace: () => void;
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
  seedPhotoUri: null,
  replaced: null,
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
  seedPhoto: (uri) => set({ photoUri: uri, seedPhotoUri: uri, lift: { status: 'idle' }, replaced: null }),
  beginReplace: () =>
    set((s) => ({
      replaced: s.replaced ?? { photoUri: s.photoUri, lift: s.lift },
      photoUri: null,
      lift: { status: 'idle' },
    })),
  cancelReplace: () =>
    set((s) => (s.replaced ? { photoUri: s.replaced.photoUri, lift: s.replaced.lift, replaced: null } : {})),
  commitReplace: () => set({ replaced: null }),
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
      seedPhotoUri: null,
      replaced: null,
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
