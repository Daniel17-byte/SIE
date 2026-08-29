import json
import re
import sys
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "sie-app"
TARGETS = [
    BASE / "public" / "intrebari-deschise-partial.json",
    BASE / "public" / "intrebari-deschise-examen.json",
]

STOPWORDS = {
    "si", "sau", "de", "la", "cu", "din", "pe", "pentru", "care", "ale", "al", "a", "ai",
    "ce", "cum", "in", "fata", "versus", "vs", "prin", "intre", "unei", "unui", "unor",
}

CONFLICTS = [
    ("avantaje", "dezavantaje"),
    ("citire", "scriere"),
    ("sursa", "destinatie"),
    ("directa", "multiplexata"),
]


def fold(value: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", value.lower()) if not unicodedata.combining(c))


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def tokens(title: str) -> set[str]:
    # min length 3 so short tech acronyms (VXS, FMC, USB, DMA...) still count as
    # distinguishing tokens instead of being silently dropped.
    plain = fold(title)
    return {t for t in re.findall(r"[a-z0-9\-]+", plain) if len(t) >= 3 and t not in STOPWORDS}


def content_tokens(content: str) -> set[str]:
    # Strip markdown table/bold markup so formatting noise doesn't inflate overlap.
    plain = fold(re.sub(r"[|*_#>-]", " ", content))
    return {t for t in re.findall(r"[a-z0-9]+", plain) if len(t) >= 4 and t not in STOPWORDS}


def content_similar(a: str, b: str, threshold: float) -> bool:
    ta, tb = content_tokens(a), content_tokens(b)
    if not ta or not tb:
        return False
    return len(ta & tb) / len(ta | tb) >= threshold


def conflicting(a: str, b: str) -> bool:
    af, bf = fold(a), fold(b)
    return any((l in af and r in bf) or (r in af and l in bf) for l, r in CONFLICTS)


def similar(a: str, b: str, threshold: float = 0.90) -> bool:
    if conflicting(a, b):
        return False
    if fold(compact(a)) == fold(compact(b)):
        return True
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    union = ta | tb
    return len(ta & tb) / len(union) >= threshold


def dedupe(items: list[dict], threshold: float = 0.90, by: str = "title") -> tuple[list[dict], list[tuple[str, str]]]:
    kept: list[dict] = []
    removed: list[tuple[str, str]] = []
    for item in items:
        if by == "content":
            match = next((k for k in kept if content_similar(item["content"], k["content"], threshold)), None)
        else:
            match = next((k for k in kept if similar(item["title"], k["title"], threshold)), None)
        if match:
            removed.append((item["title"], match["title"]))
            continue
        kept.append(item)
    return kept, removed


def main() -> None:
    dry_run = "--apply" not in sys.argv
    threshold = 0.90
    by = "title"
    for arg in sys.argv[1:]:
        if arg.startswith("--threshold="):
            threshold = float(arg.split("=", 1)[1])
        if arg.startswith("--by="):
            by = arg.split("=", 1)[1]

    for path in TARGETS:
        items = json.loads(path.read_text(encoding="utf-8"))
        kept, removed = dedupe(items, threshold, by)

        print(f"\n{path.name}: {len(items)} -> {len(kept)} (removed {len(removed)})")
        for dup, original in removed:
            print(f"  - {dup!r}\n    ~ merged into: {original!r}")

        if not dry_run:
            path.write_text(json.dumps(kept, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if dry_run:
        print("\nDry run only — rerun with --apply to write changes.")


if __name__ == "__main__":
    main()
