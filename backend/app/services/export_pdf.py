from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _footer(canvas, doc):
  canvas.saveState()
  canvas.setFont("Helvetica", 8)
  canvas.drawString(2*cm, 1.2*cm, f"Chatmind · {date.today():%d %b %Y}")
  canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
  canvas.restoreState()



def build_pdf(project, docs: list, findings: list[dict]) -> bytes:
    ss = getSampleStyleSheet()
    small = ss["Normal"].clone("small", fontSize=8, textColor=colors.grey)
    buf = BytesIO()
    pdf = SimpleDocTemplate(
        buf, pagesize=A4, title=project.name,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )

    story = [Paragraph(escape(project.name), ss["Title"])]
    if project.description:
        story.append(Paragraph(escape(project.description), ss["Normal"]))
    story.append(Spacer(1, 10))

    indexed = sum(d.status == "indexed" for d in docs)
    story.append(Paragraph(
        f"{len(docs)} sources · {indexed} indexed · {sum(d.chunks for d in docs)} chunks", small))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Key findings", ss["Heading2"]))
    if not findings:
        story.append(Paragraph("No findings available.", ss["Normal"]))
    for i, f in enumerate(findings, 1):
        story.append(Paragraph(f"{i}. {escape(str(f.get('title', '')))}", ss["Heading3"]))
        story.append(Paragraph(escape(str(f.get("body", ""))), ss["Normal"]))
        srcs = ", ".join(str(s) for s in f.get("sources", []) or [])
        if srcs:
            story.append(Paragraph(f"Sources: {escape(srcs)}", small))
        story.append(Spacer(1, 8))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Sources", ss["Heading2"]))
    rows = [["Name", "Status", "Chunks"]] + [
        [Paragraph(escape(d.name), ss["Normal"]), d.status, str(d.chunks)] for d in docs
    ]
    table = Table(rows, colWidths=[11 * cm, 3 * cm, 3 * cm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f3d2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(table)

    pdf.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()

    