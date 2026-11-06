"""
Infographic Image Generator for AI Reel Studio.
Generates high-resolution Arabic infographic and explainer graphic cards (.png)
for educational, religious, medical, and story reels with split-screen layouts.
Uses bundled Cairo & Amiri Arabic fonts for typography.
"""
import os
import uuid
import re
from pathlib import Path
from django.conf import settings
from PIL import Image, ImageDraw, ImageFont

FONTS_DIR = Path(__file__).resolve().parent / 'fonts'

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    HAS_ARABIC_SUPPORT = True
except ImportError:
    HAS_ARABIC_SUPPORT = False


def reshape_ar(text: str) -> str:
    """Properly shape and reverse Arabic text for Right-to-Left PIL rendering."""
    if not text:
        return ''
    s = str(text).strip()
    if not HAS_ARABIC_SUPPORT:
        return s
    try:
        reshaped = arabic_reshaper.reshape(s)
        return get_display(reshaped)
    except Exception:
        return s


def get_font(size: int, bold: bool = False, family: str = 'cairo'):
    """Load the best available Arabic-supporting font on the system."""
    font_candidates = []
    custom_path = os.environ.get('REEL_FONT_PATH')
    if custom_path and Path(custom_path).exists():
        font_candidates.append(custom_path)

    if family == 'amiri' and (FONTS_DIR / 'Amiri-Bold.ttf').exists():
        font_candidates.append(str(FONTS_DIR / 'Amiri-Bold.ttf'))

    if bold:
        font_candidates.extend([
            str(FONTS_DIR / 'Cairo-Bold.ttf'),
            str(FONTS_DIR / 'Amiri-Bold.ttf'),
            'C:/Windows/Fonts/tahomabd.ttf',
            'C:/Windows/Fonts/segoeuib.ttf',
            'C:/Windows/Fonts/arialbd.ttf',
            'C:/Windows/Fonts/tahoma.ttf',
            'C:/Windows/Fonts/arial.ttf',
        ])
    else:
        font_candidates.extend([
            str(FONTS_DIR / 'Cairo-Regular.ttf'),
            str(FONTS_DIR / 'Cairo-Bold.ttf'),
            'C:/Windows/Fonts/tahoma.ttf',
            'C:/Windows/Fonts/segoeui.ttf',
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/calibri.ttf',
        ])

    for candidate in font_candidates:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except Exception:
                continue

    return ImageFont.load_default()


def create_infographic_image(
    headline: str,
    subtitle: str = '',
    bullets: list | str = None,
    color_mood: str = 'gold',
    badge_label: str = None,
    width: int = 1080,
    height: int = 960,
) -> Path:
    """
    Renders an infographic card as a PNG image with Cairo typography.
    Returns the Path to the saved image file.
    """
    # Color Palettes (Rich, refined studio palettes for all 12 director skills)
    palettes = {
        'warm_paper': {
            'bg': (250, 246, 238),            # Authentic Warm Paper Canvas
            'card': (255, 255, 255),          # Crisp White Card
            'border': (226, 216, 198),        # Linen Border
            'accent': (35, 61, 52),           # Deep Forest Ink Headline
            'accent_line': (234, 179, 8),     # Yellow Highlighter Line
            'text_main': (35, 61, 52),
            'text_muted': (100, 116, 107),
            'pill_bg': (254, 240, 138),       # Yellow Marker Pill
            'pill_border': (250, 204, 21),
            'pill_dot': (202, 138, 4),
            'badge_bg': (254, 240, 138),      # Highlight Badge
            'badge_border': (250, 204, 21),
            'badge_text': (161, 98, 7),
        },
        'glass': {
            'bg': (15, 23, 42),               # Cinematic Slate
            'card': (24, 34, 54),             # Frosted Glass Card
            'border': (56, 189, 248),         # Glowing Cyan Rim
            'accent': (125, 211, 252),        # Luminous Sky Blue
            'accent_line': (56, 189, 248),
            'text_main': (255, 255, 255),
            'text_muted': (148, 163, 184),
            'pill_bg': (30, 41, 59),
            'pill_border': (56, 189, 248),
            'pill_dot': (56, 189, 248),
            'badge_bg': (15, 23, 42),
            'badge_border': (56, 189, 248),
            'badge_text': (56, 189, 248),
        },
        'proof': {
            'bg': (6, 32, 24),                # Deep Evidence Green
            'card': (12, 44, 34),
            'border': (16, 185, 129),         # Verified Emerald Rim
            'accent': (110, 231, 183),
            'accent_line': (16, 185, 129),
            'text_main': (255, 255, 255),
            'text_muted': (167, 243, 208),
            'pill_bg': (6, 78, 59),
            'pill_border': (16, 185, 129),
            'pill_dot': (52, 211, 153),
            'badge_bg': (6, 78, 59),
            'badge_border': (16, 185, 129),
            'badge_text': (52, 211, 153),
        },
        'product': {
            'bg': (15, 23, 42),               # Modern SaaS Indigo
            'card': (30, 41, 59),
            'border': (99, 102, 241),
            'accent': (165, 180, 252),
            'accent_line': (99, 102, 241),
            'text_main': (255, 255, 255),
            'text_muted': (148, 163, 184),
            'pill_bg': (49, 46, 129),
            'pill_border': (99, 102, 241),
            'pill_dot': (129, 140, 248),
            'badge_bg': (49, 46, 129),
            'badge_border': (99, 102, 241),
            'badge_text': (165, 180, 252),
        },
        'tutorial': {
            'bg': (15, 23, 42),               # Educational Cobalt
            'card': (24, 36, 60),
            'border': (59, 130, 246),
            'accent': (147, 197, 253),
            'accent_line': (59, 130, 246),
            'text_main': (255, 255, 255),
            'text_muted': (148, 163, 184),
            'pill_bg': (30, 58, 138),
            'pill_border': (59, 130, 246),
            'pill_dot': (96, 165, 250),
            'badge_bg': (30, 58, 138),
            'badge_border': (59, 130, 246),
            'badge_text': (147, 197, 253),
        },
        'tips': {
            'bg': (24, 18, 12),               # High Energy Amber
            'card': (38, 26, 16),
            'border': (245, 158, 11),
            'accent': (252, 211, 77),
            'accent_line': (245, 158, 11),
            'text_main': (255, 255, 255),
            'text_muted': (214, 211, 209),
            'pill_bg': (69, 26, 3),
            'pill_border': (245, 158, 11),
            'pill_dot': (251, 191, 36),
            'badge_bg': (69, 26, 3),
            'badge_border': (245, 158, 11),
            'badge_text': (251, 191, 36),
        },
        'doodle': {
            'bg': (12, 24, 36),               # Conceptual Blueprint
            'card': (18, 36, 54),
            'border': (14, 165, 233),
            'accent': (125, 211, 252),
            'accent_line': (14, 165, 233),
            'text_main': (255, 255, 255),
            'text_muted': (186, 230, 253),
            'pill_bg': (12, 74, 110),
            'pill_border': (14, 165, 233),
            'pill_dot': (56, 189, 248),
            'badge_bg': (12, 74, 110),
            'badge_border': (14, 165, 233),
            'badge_text': (125, 211, 252),
        },
        'bold': {
            'bg': (10, 10, 10),               # Obsidian Contrast
            'card': (20, 20, 20),
            'border': (244, 63, 94),
            'accent': (250, 204, 21),
            'accent_line': (244, 63, 94),
            'text_main': (255, 255, 255),
            'text_muted': (200, 200, 200),
            'pill_bg': (136, 19, 55),
            'pill_border': (244, 63, 94),
            'pill_dot': (250, 204, 21),
            'badge_bg': (136, 19, 55),
            'badge_border': (244, 63, 94),
            'badge_text': (250, 204, 21),
        },
        'gold': {
            'bg': (16, 14, 12),
            'card': (26, 22, 18),
            'border': (72, 58, 44),
            'accent': (245, 208, 138),        # Radiant Warm Cream Gold
            'accent_line': (245, 158, 11),     # Bright Amber Gold
            'text_main': (255, 255, 255),
            'text_muted': (190, 182, 172),
            'pill_bg': (38, 32, 26),
            'pill_border': (86, 68, 52),
            'pill_dot': (245, 158, 11),
            'badge_bg': (42, 32, 22),
            'badge_border': (100, 76, 48),
            'badge_text': (251, 191, 36),
        },
        'cyan': {
            'bg': (10, 16, 24),
            'card': (16, 26, 38),
            'border': (36, 64, 88),
            'accent': (103, 232, 249),        # Soft Cyan
            'accent_line': (6, 182, 212),      # Electric Cyan
            'text_main': (255, 255, 255),
            'text_muted': (170, 195, 215),
            'pill_bg': (24, 38, 54),
            'pill_border': (48, 86, 120),
            'pill_dot': (6, 182, 212),
            'badge_bg': (20, 42, 60),
            'badge_border': (44, 96, 136),
            'badge_text': (103, 232, 249),
        },
        'emerald': {
            'bg': (10, 20, 16),
            'card': (16, 32, 26),
            'border': (34, 72, 58),
            'accent': (110, 231, 183),        # Soft Mint
            'accent_line': (16, 185, 129),     # Emerald Green
            'text_main': (255, 255, 255),
            'text_muted': (175, 205, 192),
            'pill_bg': (22, 44, 36),
            'pill_border': (44, 94, 76),
            'pill_dot': (16, 185, 129),
            'badge_bg': (18, 46, 36),
            'badge_border': (40, 102, 80),
            'badge_text': (110, 231, 183),
        },
    }

    pal = palettes.get(color_mood, palettes['gold'])

    img = Image.new('RGB', (width, height), pal['bg'])
    draw = ImageDraw.Draw(img)

    # Top accent bar with warm glow
    draw.rectangle((0, 0, width, 12), fill=pal['accent_line'])

    # Inner container card with rounded corners
    margin = 44
    box = (margin, margin + 20, width - margin, height - margin)
    draw.rounded_rectangle(box, radius=36, fill=pal['card'], outline=pal['border'], width=2)

    # Decorative top badge
    font_badge = get_font(22, bold=True)
    display_badge = reshape_ar(badge_label or '✦  إضاءة توضيحية  ✦')
    badge_w = max(230, int(len(display_badge) * 14))
    draw.rounded_rectangle((width/2 - badge_w/2, margin + 46, width/2 + badge_w/2, margin + 92), radius=16, fill=pal['badge_bg'], outline=pal['badge_border'], width=1)
    draw.text((width / 2, margin + 69), display_badge, font=font_badge, fill=pal['badge_text'], anchor='mm')

    # Main Title in Cairo Bold
    font_title = get_font(56, bold=True)
    title_text = reshape_ar(headline[:80])
    draw.text((width / 2, 235), title_text, font=font_title, fill=pal['accent'], anchor='mm')

    # Subtitle in Cairo Regular
    div_y = 410
    if subtitle:
        font_sub = get_font(32, bold=False)
        sub_text = reshape_ar(subtitle[:100])
        draw.text((width / 2, 335), sub_text, font=font_sub, fill=pal['text_muted'], anchor='mm')
    else:
        div_y = 350

    # Divider line with diamond center
    draw.line([(width/2 - 190, div_y), (width/2 - 24, div_y)], fill=pal['border'], width=2)
    draw.line([(width/2 + 24, div_y), (width/2 + 190, div_y)], fill=pal['border'], width=2)
    font_diamond = get_font(26, bold=True)
    draw.text((width / 2, div_y), reshape_ar('◆'), font=font_diamond, fill=pal['accent_line'], anchor='mm')

    # Process items / bullets
    raw_items = []
    if isinstance(bullets, list):
        for b in bullets:
            if b:
                raw_items.extend([part.strip() for part in str(b).split('·') if part.strip()])
    elif isinstance(bullets, str) and bullets.strip():
        split_items = re.split(r'[·•,،\n]+', bullets)
        raw_items = [it.strip() for it in split_items if it.strip()]

    if raw_items:
        font_pill = get_font(30, bold=True)
        pill_h = 76
        pill_pads = 38
        pill_spacing = 22

        pill_widths = []
        for it in raw_items[:6]:
            txt = reshape_ar(it[:32])
            bbox = font_pill.getbbox(txt)
            w = (bbox[2] - bbox[0]) + pill_pads * 2 + 18
            pill_widths.append((w, txt))

        total_pills_w = sum(w for w, _ in pill_widths) + pill_spacing * (len(pill_widths) - 1)
        max_allowed_w = width - margin * 2 - 60

        # One row of pills
        if total_pills_w <= max_allowed_w and len(pill_widths) <= 4:
            cur_x = (width - total_pills_w) / 2
            pill_y = div_y + 130
            for w, txt in pill_widths:
                pill_rect = (cur_x, pill_y - pill_h/2, cur_x + w, pill_y + pill_h/2)
                draw.rounded_rectangle(pill_rect, radius=22, fill=pal['pill_bg'], outline=pal['pill_border'], width=2)
                draw.text((cur_x + w/2, pill_y), txt, font=font_pill, fill=pal['text_main'], anchor='mm')
                cur_x += w + pill_spacing
        else:
            # Wrap into 2 balanced rows of pills
            half = (len(pill_widths) + 1) // 2
            row1 = pill_widths[:half]
            row2 = pill_widths[half:]

            for row_idx, row in enumerate([row1, row2]):
                if not row:
                    continue
                row_w = sum(w for w, _ in row) + pill_spacing * (len(row) - 1)
                cur_x = (width - row_w) / 2
                pill_y = div_y + 90 + row_idx * (pill_h + 22)
                for w, txt in row:
                    pill_rect = (cur_x, pill_y - pill_h/2, cur_x + w, pill_y + pill_h/2)
                    draw.rounded_rectangle(pill_rect, radius=22, fill=pal['pill_bg'], outline=pal['pill_border'], width=2)
                    draw.text((cur_x + w/2, pill_y), txt, font=font_pill, fill=pal['text_main'], anchor='mm')
                    cur_x += w + pill_spacing

    # Save to media folder
    out_dir = Path(settings.MEDIA_ROOT) / 'uploads' / 'infographics'
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"infographic_{uuid.uuid4().hex[:10]}.png"
    out_path = out_dir / filename
    img.save(out_path, format='PNG', optimize=True)
    return out_path


def create_infographic_media_file(
    project,
    headline: str,
    subtitle: str = '',
    bullets: list | str = None,
    color_mood: str = 'gold',
    badge_label: str = None,
):
    """
    Creates an infographic image and registers it as a MediaFile in the database.
    """
    from .models import MediaFile

    file_path = create_infographic_image(
        headline=headline,
        subtitle=subtitle,
        bullets=bullets,
        color_mood=color_mood,
        badge_label=badge_label,
    )

    rel_path = f"uploads/infographics/{file_path.name}"
    media_file = MediaFile.objects.create(
        project=project,
        media_type='image',
        status='ready',
        original_name=f"{headline[:30]}.png",
        file=rel_path,
        size=file_path.stat().st_size,
        mime_type='image/png',
        video_width=1080,
        video_height=960,
    )
    return media_file
