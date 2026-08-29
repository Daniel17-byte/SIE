import os
import re

import fitz  # PyMuPDF

pdf_file = "/Users/daniellungu/Desktop/UT AC/SIE/Curs/SIE/materiale/Examen 2.pdf"
output_dir = "/Users/daniellungu/Desktop/the shield that guards the realm of men"

# Detecteaza inceput de intrebare: 1. / 1) / 12. etc.
QUESTION_START_RE = re.compile(r"^\s*(\d{1,3})\s*[\.)]\s+")

# Rezolutia imaginii rezultate (2.0 ~ 144 DPI, 3.0 ~ 216 DPI)
ZOOM = 3.0
MARGIN = 12  # puncte PDF


def extract_lines(page: fitz.Page):
    """Extrage liniile de text cu bbox, ordonate top-to-bottom."""
    data = page.get_text("dict")
    lines = []

    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            parts = []
            for span in line.get("spans", []):
                txt = span.get("text", "")
                if txt:
                    parts.append(txt)
            text = "".join(parts).strip()
            if text:
                x0, y0, x1, y1 = line["bbox"]
                lines.append({"text": text, "rect": fitz.Rect(x0, y0, x1, y1)})

    lines.sort(key=lambda item: (item["rect"].y0, item["rect"].x0))
    return lines


def detect_question_regions(lines):
    """Grupeaza liniile in regiuni de intrebari pe baza numerotarii."""
    regions = []
    current = None

    for line in lines:
        text = line["text"]
        rect = line["rect"]

        if QUESTION_START_RE.match(text):
            if current is not None:
                regions.append(current)
            current = fitz.Rect(rect)
        elif current is not None:
            current.include_rect(rect)

    if current is not None:
        regions.append(current)

    return regions


def save_question_images(pdf_path: str, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    question_index = 1

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        lines = extract_lines(page)
        regions = detect_question_regions(lines)

        for region in regions:
            # Extinde un pic zona ca sa nu taie textul.
            region = fitz.Rect(
                max(0, region.x0 - MARGIN),
                max(0, region.y0 - MARGIN),
                min(page.rect.width, region.x1 + MARGIN),
                min(page.rect.height, region.y1 + MARGIN),
            )

            pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=region, alpha=False)
            output_path = os.path.join(out_dir, f"examen_2_{question_index:03d}.jpg")
            pix.save(output_path)
            question_index += 1

    doc.close()
    print(f"Au fost salvate {question_index - 1} imagini (cate una per intrebare) in {out_dir}")


if __name__ == "__main__":
    save_question_images(pdf_file, output_dir)
