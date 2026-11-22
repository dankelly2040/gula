import { createContext, useContext } from 'react';

/**
 * True once the animated launch splash has handed off. Screens with an
 * entrance sequence wait for it, so the sequence does not play out of sight
 * behind the splash overlay. Defaults to true for anything rendered outside
 * the root layout (tests, previews).
 */
export const SplashDoneContext = createContext(true);

export function useSplashDone(): boolean {
  return useContext(SplashDoneContext);
}
