#!/usr/bin/env python3
"""生成字幕翻译扩展图标 — 使用翻译气泡设计，避免 YouTube 品牌元素"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """创建指定尺寸的图标 — 深蓝绿渐变 + A⇄中 翻译气泡"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # --- 1. 圆角矩形背景 (深蓝绿渐变模拟) ---
    margin = max(1, int(size * 0.04))
    radius = int(size * 0.18)

    # 渐变：从深青 #0D5C6E 到深蓝 #1A3A5C
    for y in range(margin, size - margin):
        ratio = (y - margin) / max(1, (size - 2 * margin))
        r = int(13 + (26 - 13) * ratio)
        g = int(92 + (58 - 92) * ratio)
        b = int(110 + (92 - 110) * ratio)
        draw.line([(margin, y), (size - margin - 1, y)], fill=(r, g, b, 255))

    # 创建圆角蒙版
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, size - margin - 1, size - margin - 1],
        radius=radius, fill=255
    )
    img.putalpha(mask)

    # 重新获取 draw（因为 alpha 通道变了）
    draw = ImageDraw.Draw(img)

    # --- 2. 左上气泡 (白色描边) ---
    bw = size * 0.42  # bubble width
    bh = size * 0.32  # bubble height
    bx = size * 0.12
    by = size * 0.14
    br = int(size * 0.06)  # bubble corner radius
    outline_w = max(1, int(size * 0.02))

    draw.rounded_rectangle(
        [bx, by, bx + bw, by + bh],
        radius=br, outline='white', width=outline_w
    )
    # 气泡小尾巴（左下角）
    tail_size = max(2, int(size * 0.06))
    tail_points = [
        (bx + bw * 0.2, by + bh),
        (bx + bw * 0.1, by + bh + tail_size),
        (bx + bw * 0.35, by + bh),
    ]
    draw.polygon(tail_points, fill=(13, 92, 110, 255), outline='white')
    # 覆盖气泡底边与尾巴交界的线
    draw.line(
        [(bx + bw * 0.18, by + bh), (bx + bw * 0.37, by + bh)],
        fill=(13, 92, 110, 255), width=outline_w + 1
    )

    # --- 3. 右下气泡 (白色填充) ---
    b2w = size * 0.42
    b2h = size * 0.32
    b2x = size * 0.46
    b2y = size * 0.44
    b2r = int(size * 0.06)

    draw.rounded_rectangle(
        [b2x, b2y, b2x + b2w, b2y + b2h],
        radius=b2r, fill='white'
    )
    # 气泡小尾巴（右下角）
    tail2_points = [
        (b2x + b2w * 0.65, b2y + b2h),
        (b2x + b2w * 0.9, b2y + b2h + tail_size),
        (b2x + b2w * 0.8, b2y + b2h),
    ]
    draw.polygon(tail2_points, fill='white')

    # --- 4. 文字 ---
    # "A" 在左气泡中央（白色）
    a_font_size = max(8, int(size * 0.22))
    try:
        a_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", a_font_size)
    except Exception:
        a_font = ImageFont.load_default()

    a_bbox = draw.textbbox((0, 0), "A", font=a_font)
    a_tw = a_bbox[2] - a_bbox[0]
    a_th = a_bbox[3] - a_bbox[1]
    a_cx = bx + (bw - a_tw) / 2
    a_cy = by + (bh - a_th) / 2 - a_bbox[1]
    draw.text((a_cx, a_cy), "A", fill='white', font=a_font)

    # "中" 在右气泡中央（深色）
    zh_font_size = max(8, int(size * 0.20))
    try:
        zh_font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", zh_font_size)
    except Exception:
        try:
            zh_font = ImageFont.truetype("/System/Library/Fonts/STHeiti Light.ttc", zh_font_size)
        except Exception:
            zh_font = ImageFont.load_default()

    zh_bbox = draw.textbbox((0, 0), "中", font=zh_font)
    zh_tw = zh_bbox[2] - zh_bbox[0]
    zh_th = zh_bbox[3] - zh_bbox[1]
    zh_cx = b2x + (b2w - zh_tw) / 2
    zh_cy = b2y + (b2h - zh_th) / 2 - zh_bbox[1]
    draw.text((zh_cx, zh_cy), "中", fill=(20, 60, 90), font=zh_font)

    # --- 5. 箭头 (双向，中间位置) ---
    arrow_y = size * 0.44
    arrow_x1 = bx + bw * 0.7
    arrow_x2 = b2x + b2w * 0.3
    arrow_w = max(1, int(size * 0.018))
    arrow_head = max(2, int(size * 0.04))

    # 右箭头 →
    draw.line([(arrow_x1, arrow_y - size * 0.02), (arrow_x2, arrow_y - size * 0.02)],
              fill='white', width=arrow_w)
    draw.polygon([
        (arrow_x2, arrow_y - size * 0.02 - arrow_head * 0.5),
        (arrow_x2 + arrow_head, arrow_y - size * 0.02),
        (arrow_x2, arrow_y - size * 0.02 + arrow_head * 0.5),
    ], fill='white')

    # 左箭头 ←
    draw.line([(arrow_x2, arrow_y + size * 0.04), (arrow_x1, arrow_y + size * 0.04)],
              fill='white', width=arrow_w)
    draw.polygon([
        (arrow_x1, arrow_y + size * 0.04 - arrow_head * 0.5),
        (arrow_x1 - arrow_head, arrow_y + size * 0.04),
        (arrow_x1, arrow_y + size * 0.04 + arrow_head * 0.5),
    ], fill='white')

    # 转换为 RGB (Chrome 图标不需要透明度，白色背景更安全)
    bg = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    bg.paste(img, (0, 0), img)
    return bg.convert('RGBA')


# 生成三个尺寸的图标
sizes = [16, 48, 128]
script_dir = os.path.dirname(os.path.abspath(__file__))

for size in sizes:
    icon = create_icon(size)
    output_path = os.path.join(script_dir, f'icon{size}.png')
    icon.save(output_path, 'PNG')
    print(f'✅ 生成 icon{size}.png ({size}x{size})')

print('\n🎉 所有图标生成完成！')
print('📌 设计：深蓝绿渐变 + A⇄中 翻译气泡（无 YouTube 品牌元素）')
