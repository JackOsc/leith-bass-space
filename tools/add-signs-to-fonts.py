#!/usr/bin/env python3
"""
Adds the flat, natural and sharp signs (U+266D to U+266F) to the worksheets skill's bundled Inter and Oswald,
which are Latin subsets without them, and writes the two small "LBS Signs" fonts that hold only the signs.

Why both: the figure renderer (resvg) sets a whole label in one font, so the signs have to be inside Inter and
Oswald themselves or a label with a flat in it falls back to another typeface. Word and LibreOffice may prefer a
copy of Inter already installed on the machine over the embedded one, so documents set each sign in "LBS Signs",
which exists nowhere else.

The outlines come from DejaVu Sans 2.37 (regular for Inter 400, bold for Inter 600 and Oswald 700). Those three
glyphs are DejaVu's own additions, which its licence places in the public domain. Inter and Oswald are under the
SIL Open Font License 1.1 with no Reserved Font Name, so a modified version may keep the name; the modified files
stay under the OFL.

    python3 tools/add-signs-to-fonts.py DejaVuSans.ttf DejaVuSans-Bold.ttf skill/leith-bass-worksheets/assets/fonts

Safe to run again: a font that already has the signs is left alone.
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

SIGNS = [0x266D, 0x266E, 0x266F]
regular, bold, fonts = sys.argv[1], sys.argv[2], sys.argv[3]

def add(target, source, squeeze=1.0):
    path = os.path.join(fonts, target)
    font, src = TTFont(path), TTFont(source)
    if all(cp in font.getBestCmap() for cp in SIGNS):
        print(target, 'already has the signs'); return
    scale = font['head'].unitsPerEm / src['head'].unitsPerEm
    # sized by capital height, so a flat stands as tall beside a B in this face as it does in DejaVu
    scale *= (font['OS/2'].sCapHeight / font['head'].unitsPerEm) / (src['OS/2'].sCapHeight / src['head'].unitsPerEm) if getattr(src['OS/2'], 'sCapHeight', 0) else 1
    glyphs = src.getGlyphSet()
    for cp in SIGNS:
        name = src.getBestCmap()[cp]
        new = 'uni%04X' % cp
        pen = TTGlyphPen(None)
        glyphs[name].draw(TransformPen(pen, (scale * squeeze, 0, 0, scale, 0, 0)))
        font['glyf'][new] = pen.glyph()   # (this also adds the name to the font's glyph order)
        advance, lsb = src['hmtx'][name]
        font['hmtx'][new] = (round(advance * scale * squeeze), round(lsb * scale * squeeze))
        for table in font['cmap'].tables:
            if table.isUnicode(): table.cmap[cp] = new
    font.save(path)
    print(target, 'signs added at scale %.3f' % scale)

def signs_font(source, out, family):
    font = TTFont(source)
    options = subset.Options(); options.layout_features = []; options.name_IDs = ['*']; options.notdef_outline = True
    s = subset.Subsetter(options); s.populate(unicodes=[0x20] + SIGNS); s.subset(font)
    for rec in list(font['name'].names):
        if rec.nameID in (1, 4, 16): rec.string = family
        elif rec.nameID in (2, 17): rec.string = 'Regular'
        elif rec.nameID == 6: rec.string = family.replace(' ', '')
        elif rec.nameID == 3: rec.string = family + ' 1.0 (three signs from DejaVu Sans 2.37)'
    font['OS/2'].usWeightClass = 400; font['OS/2'].fsSelection = 0x40; font['head'].macStyle = 0
    font.save(os.path.join(fonts, out)); print(out, 'written')

add('inter-latin-400-normal.ttf', regular)
add('inter-latin-600-normal.ttf', bold)
add('oswald-latin-700-normal.ttf', bold, squeeze=0.8)   # Oswald is a condensed face
signs_font(regular, 'lbs-signs-400.ttf', 'LBS Signs')
signs_font(bold, 'lbs-signs-600.ttf', 'LBS Signs SemiBold')
