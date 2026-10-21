"""Cuts the 6x2 art sheets in ../spaceFoxArt into small WebP atlases + a JS manifest (assets/atlas.js).
   Sprites touch at the nominal cell borders, so every vertical cut slides to the quietest column near the border.
   usage: python tools/cut_sprites.py"""
import os, json
import numpy as np
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'spaceFoxArt')
OUT = os.path.join(ROOT, 'assets')
os.makedirs(OUT, exist_ok=True)

# name: (file, scale, pad)
SHEETS = {
    'ship': ('ship-sprites.png', 0.75, 2),
    'enemy': ('enemy-powerup-sprites.png', 0.6, 2),
    'frog': ('frog-copilot-bust-sprites.png', 0.5, 2),
    'fox': ('starfox-bust-sprites.png', 0.5, 2),
}


def label(mask):
    """4-connected component labelling (no scipy needed): returns (labels, count)"""
    lab = np.zeros(mask.shape, np.int32); n = 0
    H, W = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; q.append((yy, xx))
    return lab, n


def cuts(alpha, n, lo=20):
    """n+1 cut positions along axis 1 of alpha (rows x cols), each slid to the least occupied column near its nominal spot"""
    W = alpha.shape[1]
    colsum = (alpha > lo).sum(axis=0)
    out = [0]
    for i in range(1, n):
        nom = round(W * i / n)
        a, b = max(1, nom - 28), min(W - 1, nom + 28)
        j = a + int(np.argmin(colsum[a:b]))
        out.append(j)
    out.append(W)
    return out


def cut_bosses(manifest):
    """boss-concept-sprites.png has an opaque blue backdrop: drop every connected patch of it (including the pockets between legs and inside rings), then split the three bosses"""
    from PIL import ImageFilter
    im = Image.open(os.path.join(SRC, 'boss-concept-sprites.png')).convert('RGB')
    a = np.array(im).astype(int)
    H, W, _ = a.shape
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    bg = ((g - r) > 11) & ((b - g) > 6) & (b < 175)
    lab, n = label(bg)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist()) - {0}
    kill = np.zeros(n + 1, bool)
    for k in range(1, n + 1):
        if k in border or sizes[k] > 600: kill[k] = True
    alpha = np.where(kill[lab], 0, 255).astype(np.uint8)
    al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.convert('RGBA'); rgba.putalpha(al)
    A = np.array(al)
    cols = (A > 40).sum(axis=0)
    # three sprites: split at the two emptiest columns near one third and two thirds
    cuts_x = [0]
    for i in (1, 2):
        nom = W * i // 3
        lo, hi = nom - 120, nom + 120
        cuts_x.append(lo + int(np.argmin(cols[lo:hi])))
    cuts_x.append(W)
    frames = []
    for i in range(3):
        cell = rgba.crop((cuts_x[i], 0, cuts_x[i + 1], H))
        ca = np.array(cell)[:, :, 3]
        ys, xs = np.where(ca > 20)
        spr = cell.crop((max(0, xs.min() - 2), max(0, ys.min() - 2), min(cell.width, xs.max() + 3), min(cell.height, ys.max() + 3)))
        spr = spr.resize((round(spr.width * 0.7), round(spr.height * 0.7)), Image.LANCZOS)
        frames.append(spr)
    wtot = sum(f.width + 2 for f in frames); hmax = max(f.height for f in frames) + 2
    atlas = Image.new('RGBA', (wtot, hmax), (0, 0, 0, 0))
    meta, x = [], 0
    for f in frames:
        atlas.paste(f, (x + 1, 1)); meta.append([x + 1, 1, f.width, f.height]); x += f.width + 2
    path = os.path.join(OUT, 'boss.webp')
    atlas.save(path, 'WEBP', quality=88, method=6)
    manifest['boss'] = {'src': 'assets/boss.webp', 'frames': meta}
    print('boss', atlas.size, os.path.getsize(path) // 1024, 'KB', cuts_x)


def main():
    manifest = {}
    for name, (fn, scale, pad) in SHEETS.items():
        im = Image.open(os.path.join(SRC, fn)).convert('RGBA')
        W, H = im.size
        a = np.array(im)[:, :, 3]
        rows = [0, H // 2, H]
        frames = []
        for r in range(2):
            band = a[rows[r]:rows[r + 1]]
            cx = cuts(band, 6)
            for c in range(6):
                box = (cx[c], rows[r], cx[c + 1], rows[r + 1])
                cell = im.crop(box)
                ca = np.array(cell)[:, :, 3]
                ys, xs = np.where(ca > 12)
                bb = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(cell.width, xs.max() + 1 + pad), min(cell.height, ys.max() + 1 + pad))
                spr = cell.crop(bb)
                spr = spr.resize((max(1, round(spr.width * scale)), max(1, round(spr.height * scale))), Image.LANCZOS)
                frames.append(spr)
        cw = max(f.width for f in frames) + 2
        ch = max(f.height for f in frames) + 2
        atlas = Image.new('RGBA', (cw * 6, ch * 2), (0, 0, 0, 0))
        meta = []
        for i, f in enumerate(frames):
            x, y = (i % 6) * cw, (i // 6) * ch
            atlas.paste(f, (x + 1, y + 1))
            meta.append([x + 1, y + 1, f.width, f.height])
        path = os.path.join(OUT, name + '.webp')
        atlas.save(path, 'WEBP', quality=88, method=6)
        manifest[name] = {'src': 'assets/' + name + '.webp', 'frames': meta}
        print(name, atlas.size, os.path.getsize(path) // 1024, 'KB')
    cut_bosses(manifest)
    with open(os.path.join(OUT, 'atlas.js'), 'w', encoding='utf-8') as f:
        f.write('/* generated by tools/cut_sprites.py */\nwindow.SGS = window.SGS || {};\nwindow.SGS.atlasData = ' + json.dumps(manifest) + ';\n')


main()
