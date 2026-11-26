#!/usr/bin/env python3
"""Draw the app icon: a white slice on the brand red.

Writes assets/icon.png (1024, no alpha, for iOS and the default icon) and
assets/adaptive-icon.png (1024, clear ground, slice inside Android's safe
circle; app.json sets the red behind it). The slice is the path from
`SliceArt` in src/components/onboarding-art.tsx, so the icon and the app
share one shape. Needs Google Chrome, which renders the SVG.

Run from the project root: python3 scripts/make-icon.py
The icon is part of the binary: a change needs `npx expo prebuild -p ios`
and a new build, not an update.
"""
import os
import subprocess
import tempfile

RED = "#C8102E"  # colors.brand
WHITE = "#FFFFFF"
SLICE = "M5 17 C21 8 43 8 59 17 L34 60 Q32 63 30 60 Z"
CRUST_LINE = "M11.6 21.4 C24 15.2 40 15.2 52.4 21.4"
PEPPERONI = [(32, 29, 4.4), (26, 40, 3.2), (38, 40.5, 3.2), (32, 49.5, 2.4)]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def slice_art(scale: float, center_y: float) -> str:
    """The slice in a 64 unit box, scaled and centered on a 1024 canvas."""
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{RED}"/>' for x, y, r in PEPPERONI)
    return (
        f'<g transform="translate({512 - 32 * scale:.1f},{center_y - 36 * scale:.1f}) scale({scale})">'
        f'<path d="{SLICE}" fill="{WHITE}"/>'
        f'<path d="{CRUST_LINE}" fill="none" stroke="{RED}" stroke-width="2.3" stroke-linecap="round"/>'
        f"{dots}</g>"
    )


def render(body: str, ground: str | None, out: str) -> None:
    rect = f'<rect width="1024" height="1024" fill="{ground}"/>' if ground else ""
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" '
        f'viewBox="0 0 1024 1024">{rect}{body}</svg>'
    )
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as page:
        page.write(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
    try:
        subprocess.run(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                "--window-size=1024,1024",
                *([] if ground else ["--default-background-color=00000000"]),
                f"--screenshot={os.path.abspath(out)}",
                "file://" + page.name,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        os.unlink(page.name)


if __name__ == "__main__":
    render(slice_art(12.6, 522), RED, "assets/icon.png")
    # 9.0 keeps the slice's far corners inside the 66 of 108 safe circle.
    render(slice_art(9.0, 512), None, "assets/adaptive-icon.png")
    print("wrote assets/icon.png and assets/adaptive-icon.png")
