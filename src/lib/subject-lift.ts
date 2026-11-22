import { requireNativeModule } from 'expo';

export type LiftBox = { x: number; y: number; width: number; height: number };

export type LiftResult = {
  /** Upright copy of the photo; camera JPEGs carry rotation in EXIF only. */
  photoUri: string;
  width: number;
  height: number;
  /** PNG of the subject on transparency, cropped to `box`. Null when nothing was found. */
  cutoutUri: string | null;
  /** Subject bounds, normalised 0..1 against the upright photo. */
  box: LiftBox | null;
  /** Why there is no cutout, when Vision ran but produced nothing. */
  error?: string | null;
};

type SubjectLiftNative = {
  liftSubject(uri: string): Promise<LiftResult>;
};

// Inline module (src/native/SubjectLiftModule.swift). Missing when the native
// build predates it; the log flow then keeps the whole photo.
let native: SubjectLiftNative | null = null;
try {
  native = requireNativeModule<SubjectLiftNative>('SubjectLiftModule');
} catch {
  native = null;
}

export const canLiftSubjects = native !== null;

export async function liftSubject(uri: string): Promise<LiftResult | null> {
  if (!native) return null;
  try {
    const result = await native.liftSubject(uri);
    if (__DEV__) console.log('[subject-lift]', result.cutoutUri ? 'cutout' : 'no subject', result.box, result.error);
    return result;
  } catch (e) {
    if (__DEV__) console.warn('[subject-lift] failed', e);
    return null;
  }
}
