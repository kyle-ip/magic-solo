from PIL import Image, ImageFilter
import math
import random
import os

random.seed(42)
w, h = 768, 96
img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
px = img.load()


def noise(x: float, scale: float, seed: float) -> float:
    return (
        math.sin(x * scale + seed) * 0.5
        + math.sin(x * scale * 2.3 + seed * 1.7) * 0.3
        + math.sin(x * scale * 5.1 + seed * 0.4) * 0.2
    )


mid = h // 2
for x in range(w):
    jag = (
        noise(x / w * math.pi * 2, 6.0, 1.2) * 7
        + noise(x / w * math.pi * 2, 18.0, 4.5) * 3.5
    )
    if random.random() < 0.04:
        jag += random.choice([-1, 1]) * random.uniform(4, 10)
    y0 = mid + jag
    for y in range(h):
        d = abs(y - y0)
        if d < 1.2:
            col = (48, 28, 12, 210)
        elif d < 2.8:
            a = int(160 * (1 - (d - 1.2) / 1.6))
            col = (62, 36, 16, a)
        elif d < 5.5:
            a = int(70 * (1 - (d - 2.8) / 2.7))
            if random.random() < 0.08:
                col = (232, 214, 180, min(90, a + 20))
            else:
                col = (90, 55, 28, a)
        elif d < 12 and random.random() < 0.012 * (1 - d / 12):
            col = (70, 42, 20, random.randint(40, 100))
        else:
            continue
        px[x, y] = col

soft = img.filter(ImageFilter.GaussianBlur(radius=0.6))
out = Image.alpha_composite(Image.new("RGBA", (w, h), (0, 0, 0, 0)), soft)

path = r"c:\Projects\magic-solo\public\assets\pack\tear-edge.png"
os.makedirs(os.path.dirname(path), exist_ok=True)
out.save(path, "PNG")
print("wrote", path, out.size)
