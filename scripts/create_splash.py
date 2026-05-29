import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

W, H = 1440, 3120
OUT = '/Users/karthikjayasrimac/Documents/OFC/dabbu/apps/mobile/assets/splash.png'
LOGO = '/Users/karthikjayasrimac/Documents/OFC/dabbu/apps/mobile/assets/logo.png'

img = Image.new('RGBA', (W, H), (255, 255, 255, 255))
draw = ImageDraw.Draw(img, 'RGBA')

# ── 1. Background gradient: white → soft light gray (#F5F5F7) ──
for y in range(H):
    t = y / H
    r = int(255 - t * 10)
    bw = int(245 - t * 8)
    draw.line([(0, y), (W, y)], fill=(r, r, r, 255))

# ── 2. Bottom zone: very light warm gradient ──
for y in range(H - 600, H):
    t = (y - (H - 600)) / 600
    base_r = 250 - int(t * 20)
    base_g = 240 - int(t * 15)
    base_b = 235 - int(t * 15)
    for x in range(W):
        draw.point((x, y), fill=(base_r, base_g, base_b, 255))

# ── 3. Radial orange glow behind logo ──
cx, cy = W // 2, 900
for r in range(500, 0, -2):
    alpha = int(8 * (1 - r / 500))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 106, 0, alpha))

# ── 4. Subtle world/digital mesh lines ──
for grid_y in range(600, 2400, 80):
    alpha = max(0, 6 - int(abs(grid_y - 1500) / 150))
    draw.line([(200, grid_y), (1240, grid_y)], fill=(255, 106, 0, alpha))

for grid_angle in range(0, 360, 30):
    rad = math.radians(grid_angle)
    x1 = cx + 400 * math.cos(rad)
    y1 = cy + 400 * math.sin(rad)
    x2 = cx + 600 * math.cos(rad)
    y2 = cy + 600 * math.sin(rad)
    alpha = 4
    draw.line([(x1, y1), (x2, y2)], fill=(255, 106, 0, alpha), width=1)

# ── 5. Wave patterns near bottom ──
for wave_idx in range(4):
    amp = 30 + wave_idx * 15
    freq = 0.008 + wave_idx * 0.002
    base_y = H - 200 - wave_idx * 120
    alpha = 30 - wave_idx * 6
    points = []
    for x in range(0, W + 10, 5):
        y = base_y + amp * math.sin(x * freq) + amp * 0.3 * math.sin(x * freq * 2.3 + 1.2)
        points.append((x, y))
    draw.line(points, fill=(255, 106, 0, max(alpha, 0)), width=3)

# ── 6. Floating particles ──
random.seed(42)
for _ in range(80):
    x = random.randint(100, W - 100)
    y = random.randint(200, H - 400)
    r = random.randint(2, 5)
    alpha = random.randint(15, 50)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 106, 0, alpha))

# ── 7. Light streaks ──
random.seed(7)
for _ in range(12):
    x = random.randint(100, W - 100)
    y = random.randint(400, 2000)
    length = random.randint(80, 250)
    angle_deg = random.uniform(-30, 30)
    rad = math.radians(angle_deg)
    dx = length * math.cos(rad)
    dy = length * math.sin(rad)
    alpha = random.randint(8, 18)
    draw.line([(x, y), (x + dx, y + dy)], fill=(255, 200, 150, alpha), width=random.randint(1, 3))

# ── 8. Logo (centered at ~28% from top) ──
logo = Image.open(LOGO).convert('RGBA')
logo_w = 340
logo_h = int(logo.size[1] * (logo_w / logo.size[0]))
logo = logo.resize((logo_w, logo_h), Image.LANCZOS)

logo_x = (W - logo_w) // 2
logo_y = 720
img.paste(logo, (logo_x, logo_y), logo)

# ── 9. Soft glow ring around logo ──
glow_ring = Image.new('RGBA', (logo_w + 80, logo_h + 80), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_ring)
for i in range(15, 0, -1):
    alpha = int(6 * (1 - i / 15))
    gd.ellipse(
        [i, i, logo_w + 80 - i, logo_h + 80 - i],
        outline=(255, 106, 0, alpha),
        width=1
    )
img.paste(glow_ring, (logo_x - 40, logo_y - 40), glow_ring)

# ── 10. "Dabbu" text ──
font_path = '/System/Library/Fonts/HelveticaNeue.ttc'
try:
    name_font = ImageFont.truetype(font_path, 110, index=1)
    tagline_font = ImageFont.truetype(font_path, 38, index=0)
except:
    name_font = ImageFont.truetype('Helvetica', 110)
    tagline_font = ImageFont.truetype('Helvetica', 38)

# Name
name_text = 'Dabbu'
bbox = draw.textbbox((0, 0), name_text, font=name_font)
tw = bbox[2] - bbox[0]
name_x = (W - tw) // 2
name_y = logo_y + logo_h + 70
draw.text((name_x, name_y), name_text, fill=(30, 30, 35, 255), font=name_font)

# Tagline
tagline = 'Your Money. Your Life. Organized.'
bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
tw = bbox[2] - bbox[0]
tag_x = (W - tw) // 2
tag_y = name_y + 140
draw.text((tag_x, tag_y), tagline, fill=(120, 120, 130, 220), font=tagline_font)

# ── 11. Small decorative line under tagline ──
line_y = tag_y + 55
line_w = 80
draw.line([(W // 2 - line_w, line_y), (W // 2 + line_w, line_y)], fill=(255, 106, 0, 60), width=3)

# ── 12. Very subtle bottom branding ──
bottom_font = ImageFont.truetype(font_path, 22, index=0)
brand_text = 'Dabbu — Personal Finance'
bbox = draw.textbbox((0, 0), brand_text, font=bottom_font)
tw = bbox[2] - bbox[0]
draw.text(((W - tw) // 2, H - 120), brand_text, fill=(180, 180, 185, 120), font=bottom_font)

# ── 13. Soft vignette overlay ──
vignette = Image.new('RGBA', (W, H), (0, 0, 0, 0))
vd = ImageDraw.Draw(vignette)
for r in range(int(H * 0.45), 0, -1):
    alpha = int(2 * (1 - r / (H * 0.45)))
    if alpha <= 0:
        continue
    vd.ellipse([W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r], outline=(0, 0, 0, alpha))
img = Image.alpha_composite(img, vignette)

# ── Final touches: very slight warmth at bottom corners ──
corner_warmth = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(corner_warmth)
for x in range(W):
    for y in range(H - 400, H):
        dx = min(x, W - x)
        dy = H - y
        dist = math.sqrt(dx * dx + dy * dy)
        if dist > 600:
            continue
        alpha = int(15 * (1 - dist / 600))
        if alpha <= 0:
            continue
        cd.point((x, y), fill=(255, 106, 0, alpha))
img = Image.alpha_composite(img, corner_warmth)

# ── Convert to RGB and save ──
final = img.convert('RGB')
final.save(OUT, 'PNG')
print(f'Saved splash screen: {OUT} ({final.size[0]}x{final.size[1]})')
