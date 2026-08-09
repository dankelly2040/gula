"""Seed the leaderboard with demo players, for looking at the ranking UI.

`profiles.id` is a foreign key onto `auth.users`, and RLS only lets a user
write its own profile and its own logs. So this does not fabricate rows: each
player is a genuine anonymous sign-in, and its profile and logs are written
with that player's own token. Nothing needs the service-role key, and nothing
bypasses RLS.

Usage, from the repo root:

    set -a && . ./.env && set +a && python3 scripts/seed-leaderboard.py

Prints the cleanup SQL at the end. Deleting the auth users cascades to their
profiles and logs.
"""

import json
import os
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

URL = os.environ["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
ANON = os.environ["EXPO_PUBLIC_SUPABASE_ANON_KEY"]

# (name, city, all-time points, all-time logs)
PLAYERS = [
    ("Marco Fontana", "Naples", 340, 14),
    ("Sofia Ricci", "Brooklyn", 265, 11),
    ("Big Tony", "New Haven", 190, 8),
    ("Nina Park", "Seattle", 90, 4),
    ("Crust Fund", "Portland", 55, 2),
]

NOW = datetime.now(timezone.utc)


def post(path, body, token, prefer=None):
    req = urllib.request.Request(
        URL + path, data=json.dumps(body).encode(), method="POST"
    )
    req.add_header("apikey", ANON)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw.strip() else None


def signup():
    """A fresh anonymous user. Returns (user_id, access_token)."""
    body = post("/auth/v1/signup", {}, ANON)
    return body["user"]["id"], body["access_token"]


def main():
    created = []
    for name, city, points, logs in PLAYERS:
        uid, token = signup()
        created.append((uid, name))

        post(
            "/rest/v1/profiles",
            {
                "id": uid,
                "display_name": name,
                "home_city": city,
                "total_points": points,
                "total_logs": logs,
                "share_with_community": True,
            },
            token,
            prefer="return=minimal",
        )

        # Dated within the current month so the "This month" board has
        # something to rank. Anything older than the 1st only counts
        # towards the all-time board, which reads the profile totals.
        span = min(logs, max(1, NOW.day))
        per = max(1, points // logs)
        rows = [
            {
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "logged_at": (NOW - timedelta(days=i, hours=i)).isoformat(),
                "money_shot": max(1, min(100, 40 + points // 8 - i * 2)),
                "points_earned": per,
                "is_public": True,
            }
            for i in range(span)
        ]
        post("/rest/v1/pizza_logs", rows, token, prefer="return=minimal")
        print(f"seeded {name}: {points} points, {logs} logs")

    print("\n-- cleanup: paste into the Supabase SQL editor")
    print("delete from auth.users where id in (")
    for i, (uid, name) in enumerate(created):
        comma = "," if i < len(created) - 1 else " "
        print(f"  '{uid}'{comma}  -- {name}")
    print(");")


if __name__ == "__main__":
    main()
