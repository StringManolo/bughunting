#!/usr/bin/env bash
set -e

DEPS=(pdftotext pdfimages tesseract date)
MISSING=()

for d in "${DEPS[@]}"; do
  command -v "$d" >/dev/null 2>&1 || MISSING+=("$d")
done

if [ "${#MISSING[@]}" -ne 0 ]; then
  echo "Missing dependencies:"
  for m in "${MISSING[@]}"; do echo " - $m"; done
  echo "Install them manually using your system package manager."
  exit 1
fi

OUT=out
REPORT=report.txt
START=$(date +%s)

mkdir -p "$OUT/text" "$OUT/imgs"
> "$REPORT"

mapfile -t FILES < <(ls *.pdf 2>/dev/null)
TOTAL=${#FILES[@]}
[ "$TOTAL" -eq 0 ] && { echo "No PDF files found."; exit 1; }

COUNT=0

for f in "${FILES[@]}"; do
  COUNT=$((COUNT+1))
  NOW=$(date +%s)
  ELAPSED=$((NOW-START))
  ETA=$((ELAPSED*TOTAL/COUNT-ELAPSED))
  PCT=$((COUNT*100/TOTAL))

  printf "\r[%3d%%] %d/%d | ETA: %ds | Processing: %s" "$PCT" "$COUNT" "$TOTAL" "$ETA" "$f"

  base="${f%.pdf}"
  echo -e "\n===== FILE: $f =====" >> "$REPORT"

  pdftotext -layout "$f" "$OUT/text/$base.txt" 2>/dev/null || true
  [ -s "$OUT/text/$base.txt" ] && cat "$OUT/text/$base.txt" >> "$REPORT"

  pdfimages -all "$f" "$OUT/imgs/$base" 2>/dev/null || true

  for img in "$OUT/imgs/$base"*; do
    [ -f "$img" ] || continue
    tesseract "$img" stdout -l eng+spa 2>/dev/null >> "$REPORT" || true
  done

  echo -e "\n\n" >> "$REPORT"
done

echo -e "\nDone. Output written to $REPORT"
