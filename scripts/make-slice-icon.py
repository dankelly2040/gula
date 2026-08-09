"""Render the log tab icon: a pizza slice with a plus knocked out of it.

Alpha-only template art, so iOS tints it with the tab bar colour. No image
libraries are installed on this machine, so this writes the PNG bytes
directly and antialiases by supersampling.
"""

import math
import struct
import zlib

# Slice geometry, in a unit square. Apex near the bottom, crust arc at the top.
# Sized to fill the canvas: a tab bar caps the glyph box, so every spare
# pixel of padding is size given away.
APEX = (0.5, 0.99)
RADIUS = 0.97
HALF_ANGLE = math.radians(30.5)

# The plus. Deliberately large: it is the point of the button, and the tab bar
# caps how big the whole glyph can be. Sized so the arms keep clear air
# between themselves and the slice edge, or the silhouette stops reading.
PLUS_CENTRE = (0.5, 0.50)
PLUS_ARM = 0.175        # half-length of each arm
PLUS_THICK = 0.072      # half-thickness of each arm
PLUS_GAP = 0.028        # clear space around the plus, so it reads as a hole

SS = 4  # supersampling factor per axis


def in_slice(x, y):
    dx, dy = x - APEX[0], y - APEX[1]
    if dx * dx + dy * dy > RADIUS * RADIUS:
        return False
    # Angle away from straight up.
    return abs(math.atan2(dx, -dy)) <= HALF_ANGLE


def in_plus(x, y, arm, thick):
    dx, dy = abs(x - PLUS_CENTRE[0]), abs(y - PLUS_CENTRE[1])
    return (dx <= arm and dy <= thick) or (dy <= arm and dx <= thick)


def coverage(px, py, size):
    hits = 0
    for sy in range(SS):
        for sx in range(SS):
            x = (px + (sx + 0.5) / SS) / size
            y = (py + (sy + 0.5) / SS) / size
            if in_slice(x, y) and not in_plus(
                x, y, PLUS_ARM + PLUS_GAP, PLUS_THICK + PLUS_GAP
            ):
                hits += 1
    return hits / (SS * SS)


def png_bytes(size):
    rows = []
    for py in range(size):
        row = bytearray([0])  # filter type 0
        for px in range(size):
            a = int(round(coverage(px, py, size) * 255))
            row += bytes((0, 0, 0, a))  # black, tinted natively via alpha
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


import os

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# Two logical sizes: the tab bar item, and the larger glyph for the floating
# log button. Upscaling one asset for both leaves the button soft.
SETS = {
    "tab-icon-log": 25,
    "log-glyph": 32,
}

for name, base in SETS.items():
    for scale, suffix in ((1, ""), (2, "@2x"), (3, "@3x")):
        size = base * scale
        path = os.path.join(ASSETS, f"{name}{suffix}.png")
        with open(path, "wb") as fh:
            fh.write(png_bytes(size))
        print(f"wrote {path} ({size}x{size})")
