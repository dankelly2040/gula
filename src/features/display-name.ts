// The name a player shows on the leaderboard, as plain rules with tests.
// The server column (`profiles.display_name`) takes any text, so the app is
// the only place that tidies it.

/** Long enough for a first name and a last name; short enough for one row. */
export const NAME_MAX = 24;

/** The stand-in the board shows for a player who has not given a name. */
export const NO_NAME = 'Pizza enthusiast';

/**
 * Tidy what the player typed: one space between words, none at the ends, cut
 * to `NAME_MAX`. An empty result is null, which means "no name".
 */
export function cleanDisplayName(raw: string | null | undefined): string | null {
  const tidy = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return tidy.length > 0 ? tidy : null;
}

/** True when the player still shows as the stand-in. */
export function needsName(displayName: string | null | undefined): boolean {
  return cleanDisplayName(displayName) === null;
}
