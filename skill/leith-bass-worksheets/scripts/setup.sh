#!/usr/bin/env bash
# One-off setup for a fresh session. Safe to run repeatedly.
#  1. Installs the bundled Oswald, Inter and DejaVu Sans Mono fonts for the current user,
#     so LibreOffice (DOCX to PDF) and any other renderer see the house faces.
#  2. Installs @resvg/resvg-js globally for PNG export (no Inkscape needed).
#  3. Reports whether fontTools (for --embed-fonts) and LibreOffice are present.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONT_TARGET="${HOME}/.local/share/fonts/leith-bass"
mkdir -p "$FONT_TARGET"
cp "$HERE"/assets/fonts/*.ttf "$FONT_TARGET"/
fc-cache -f "$FONT_TARGET" >/dev/null 2>&1 || true
echo "fonts: $(fc-list | grep -ciE 'oswald|inter|dejavu sans mono') house font faces visible"

if node -e "require(require.resolve('@resvg/resvg-js',{paths:[require('child_process').execSync('npm root -g').toString().trim()]}))" 2>/dev/null; then
  echo "resvg: already installed"
else
  npm install -g @resvg/resvg-js >/dev/null 2>&1 && echo "resvg: installed" || echo "resvg: FAILED (PNG export will try Inkscape instead)"
fi

command -v pyftsubset >/dev/null && echo "fonttools: ok" || { pip install fonttools --break-system-packages -q 2>/dev/null && echo "fonttools: installed" || echo "fonttools: missing (--embed-fonts unavailable)"; }
command -v soffice >/dev/null && echo "libreoffice: ok" || echo "libreoffice: missing (PDF export unavailable; DOCX still works)"
for pkg in docx jszip; do
  node -e "require(require.resolve('$pkg',{paths:[require('child_process').execSync('npm root -g').toString().trim()]}))" 2>/dev/null && echo "$pkg: ok" \
    || { npm install -g "$pkg" >/dev/null 2>&1 && echo "$pkg: installed" || echo "$pkg: FAILED (worksheets need it)"; }
done
python3 -c "import PIL" 2>/dev/null && echo "pillow: ok" || { pip install pillow --break-system-packages -q 2>/dev/null && echo "pillow: installed" || echo "pillow: missing (contact sheets unavailable)"; }

if [[ "${1:-}" == "--lilypond" ]] || command -v lilypond >/dev/null; then
  if command -v lilypond >/dev/null; then echo "lilypond: ok ($(lilypond --version | head -1))"
  else (apt-get install -y -qq lilypond >/dev/null 2>&1 || (apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq lilypond >/dev/null 2>&1)) \
       && echo "lilypond: installed" || echo "lilypond: FAILED (grooves unavailable; scales, pitch studies and diagrams still work)"; fi
else
  echo "lilypond: not installed (only needed for rhythmic grooves; run setup.sh --lilypond)"
fi
