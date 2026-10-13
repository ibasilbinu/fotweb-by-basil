"""Create Android and iOS-ready PNG icons matching FotWeb's F↗ mark.

Run from the repository root: python -m pip install Pillow && python pwa/make_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
INK = "#0b0e11"
CARD = "#141b1b"
BORDER = "#33472b"
LIME = "#d4f76b"

# Render at high resolution for sharp small sizes, including a safe maskable area.
size = 1024
im = Image.new("RGB", (size, size), INK)
d = ImageDraw.Draw(im)
s = size / 512
def box(coords):
    return tuple(round(v * s) for v in coords)
def path(coords):
    return [tuple(round(v * s) for v in pair) for pair in coords]
d.rounded_rectangle(box((68, 68, 444, 444)), radius=round(92*s), fill=CARD, outline=BORDER, width=round(5*s))
d.polygon(path([(159, 356), (159, 163), (270, 163), (270, 202), (202, 202),
                (202, 240), (262, 240), (262, 279), (202, 279), (202, 356)]), fill=LIME)
d.line(path([(279, 342), (356, 249)]), fill=LIME, width=round(25*s), joint="curve")
d.line(path([(303, 249), (356, 249), (356, 302)]), fill=LIME, width=round(25*s), joint="curve")
r = round(12*s)
for x, y in [(279, 342), (356, 249), (303, 249), (356, 302)]:
    d.ellipse(box((x-12, y-12, x+12, y+12)), fill=LIME)
for width in (192, 512):
    im.resize((width, width), Image.Resampling.LANCZOS).save(OUT / f"icon-{width}.png", optimize=True)
print("Generated FotWeb PWA icons: 192×192 and 512×512")