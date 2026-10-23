#!/usr/bin/env python3
"""
Step 1 of the content pipeline: turn her PDFs into text the importer can read.

    python3 scripts/ingest/extract.py                 # ~/Fel Reviewers/RN2027
    python3 scripts/ingest/extract.py /path/to/RN2027

Needs poppler (pdftotext, pdftohtml) and, for scanned PDFs, ocrmypdf:
    brew install poppler ocrmypdf

Writes, inside RN2027 (originals are never changed):
    _text/<same path>.txt          text of born-digital PDFs
    _text/_layout/<same path>.xml  layout + fonts, used to read bold/green answer keys
    _ocr_text/<same path>.txt      OCR text of scanned PDFs
    <name> (searchable).pdf        a searchable copy next to each scanned original

Safe to re-run: files that already exist are skipped. Then run `npm run ingest`.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "Fel Reviewers" / "RN2027")
# Huge textbooks are reference only; the test banks inside EBOOKS are kept.
SKIP_TEXT = ("Perry & Potter", "Hinkle", "Silbert-Flagg", "Flagg_MCHN", "Videbeck", "Veenema", "Comprehensive Review")


def run(*args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def has_text(pdf: Path) -> bool:
    out = run("pdftotext", "-f", "1", "-l", "3", str(pdf), "-").stdout
    return len(out.replace("CamScanner", "").strip()) > 300


def main():
    if not ROOT.exists():
        sys.exit(f"Can't find {ROOT}")
    for tool in ("pdftotext", "pdftohtml"):
        if not shutil.which(tool):
            sys.exit("Install poppler first: brew install poppler")
    ocr = shutil.which("ocrmypdf")
    pdfs = sorted(p for p in ROOT.rglob("*.pdf") if not any(part.startswith("_") for part in p.relative_to(ROOT).parts) and "(searchable)" not in p.name)
    for pdf in pdfs:
        rel = pdf.relative_to(ROOT).with_suffix("")
        if has_text(pdf):
            if any(s in pdf.name for s in SKIP_TEXT):
                continue
            txt = ROOT / "_text" / f"{rel}.txt"
            if not txt.exists():
                txt.parent.mkdir(parents=True, exist_ok=True)
                run("pdftotext", "-enc", "UTF-8", str(pdf), str(txt))
                print("text  ", rel)
            if "EBOOKS" not in str(rel):
                xml = ROOT / "_text" / "_layout" / f"{rel}.xml"
                if not xml.exists():
                    xml.parent.mkdir(parents=True, exist_ok=True)
                    with open(xml, "w") as fh:
                        subprocess.run(["pdftohtml", "-xml", "-i", "-stdout", str(pdf)], stdout=fh, stderr=subprocess.DEVNULL)
        else:
            txt = ROOT / "_ocr_text" / f"{rel}.txt"
            if txt.exists():
                continue
            if not ocr:
                print("skip  ", rel, "(scanned; install ocrmypdf to read it)")
                continue
            txt.parent.mkdir(parents=True, exist_ok=True)
            out = pdf.with_name(pdf.stem + " (searchable).pdf")
            print("ocr   ", rel, "...")
            r = run("ocrmypdf", "--force-ocr", "--output-type", "pdf", "--optimize", "0", "--sidecar", str(txt), str(pdf), str(out))
            if r.returncode != 0:
                print("      failed:", r.stderr.strip().splitlines()[-1:] or "")
    print("Done. Now run: npm run ingest")


if __name__ == "__main__":
    os.environ.setdefault("OMP_THREAD_LIMIT", "1")
    main()
