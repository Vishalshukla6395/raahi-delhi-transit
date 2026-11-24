"""Create readable PDFs from the editable Markdown submission sources."""

from pathlib import Path
from xml.sax.saxutils import escape
import re
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

ROOT = Path(__file__).resolve().parents[1]
styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="BrandTitle",
        fontName="Helvetica-Bold",
        fontSize=30,
        leading=35,
        textColor=colors.HexColor("#173c35"),
        spaceAfter=16,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionTitle",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1b624e"),
        spaceBefore=12,
        spaceAfter=7,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="Copy",
        fontName="Helvetica",
        fontSize=10.5,
        leading=14.2,
        textColor=colors.HexColor("#334a40"),
        spaceAfter=7,
        splitLongWords=True,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCopy",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334a40"),
    )
)


def inline(text):
    text = escape(
        text.replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
        .replace("“", '"')
        .replace("”", '"')
    )
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    return text


def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor("#dce5df"))
    canvas.line(42, 43, 553, 43)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64766f"))
    canvas.drawString(
        42, 29, "RAAHI  /  Transport Stack Hackathon 2026  /  Phase 1 prototype"
    )
    canvas.drawRightString(553, 29, str(doc.page))


def build(stem):
    lines = (
        (ROOT / "submission" / f"{stem}.md").read_text(encoding="utf-8").splitlines()
    )
    flow = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if not line:
            continue
        if line.startswith("|"):
            group = [line]
            while i < len(lines) and lines[i].strip().startswith("|"):
                group.append(lines[i].strip())
                i += 1
            rows = [
                [
                    Paragraph(inline(c.strip()), styles["TableCopy"])
                    for c in r.strip("|").split("|")
                ]
                for r in group
                if not re.match(r"^\|[\s:|\-]+\|$", r)
            ]
            table = Table(
                rows,
                repeatRows=1,
                colWidths=[511 / len(rows[0])] * len(rows[0]),
                hAlign="LEFT",
            )
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f0e9")),
                        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dce5df")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                )
            )
            flow.extend([table, Spacer(1, 10)])
            continue
        if line.startswith("# "):
            flow.append(Paragraph(inline(line[2:]), styles["BrandTitle"]))
            continue
        if line.startswith("## "):
            flow.append(Paragraph(inline(line[3:]), styles["SectionTitle"]))
            continue
        flow.append(Paragraph(inline(line), styles["Copy"]))
    path = ROOT / "submission" / f"{stem}.pdf"
    SimpleDocTemplate(
        str(path),
        pagesize=(595, 842),
        rightMargin=42,
        leftMargin=42,
        topMargin=45,
        bottomMargin=60,
        title=f"RAAHI {stem}",
        author="RAAHI project",
    ).build(flow, onFirstPage=footer, onLaterPages=footer)
    print(path)


if __name__ == "__main__":
    for stem in ("proposal", "technical-note"):
        build(stem)
