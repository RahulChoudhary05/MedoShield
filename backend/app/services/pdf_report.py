"""Branded A4 PDF reports. All dynamic text is XML-escaped before it reaches
ReportLab's mini-markup parser (AI/user text must never inject markup)."""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INK = colors.HexColor("#1B1F24")
MUTED = colors.HexColor("#6B7280")
BRAND = colors.HexColor("#0F766E")
MINT = colors.HexColor("#E7F5F1")
APRICOT = colors.HexColor("#F59E6B")
LINE = colors.HexColor("#E7E2D8")


def _p(text: Any) -> str:
    return escape(str(text if text is not None else "")).replace("\n", "<br/>")


class ReportBuilder:
    def __init__(self) -> None:
        ss = getSampleStyleSheet()
        self.h1 = ParagraphStyle("h1", parent=ss["Heading1"], fontName="Helvetica-Bold", fontSize=20, textColor=INK, spaceAfter=4)
        self.sub = ParagraphStyle("sub", parent=ss["Normal"], fontSize=10, textColor=MUTED, spaceAfter=14)
        self.h2 = ParagraphStyle("h2", parent=ss["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, textColor=BRAND, spaceBefore=14, spaceAfter=6)
        self.body = ParagraphStyle("body", parent=ss["Normal"], fontSize=10.5, leading=15, textColor=INK, alignment=TA_LEFT)
        self.small = ParagraphStyle("small", parent=ss["Normal"], fontSize=8, leading=11, textColor=MUTED)

    def _frame(self, canvas, doc) -> None:
        w, h = A4
        canvas.saveState()
        canvas.setFillColor(BRAND)
        canvas.roundRect(1.5 * cm, h - 1.75 * cm, 0.55 * cm, 0.55 * cm, 3, fill=1, stroke=0)
        canvas.setFont("Helvetica-Bold", 10.5)
        canvas.setFillColor(INK)
        canvas.drawString(2.25 * cm, h - 1.6 * cm, "MedoShield AI")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(w - 1.5 * cm, h - 1.6 * cm, datetime.now(timezone.utc).strftime("Generated %d %b %Y, %H:%M UTC"))
        canvas.setStrokeColor(LINE)
        canvas.line(1.5 * cm, h - 2.05 * cm, w - 1.5 * cm, h - 2.05 * cm)
        canvas.drawString(1.5 * cm, 1.2 * cm, "AI-assisted monitoring report - not a diagnosis. Review with a licensed clinician.")
        canvas.drawRightString(w - 1.5 * cm, 1.2 * cm, f"Page {doc.page}")
        canvas.restoreState()

    def _kv(self, rows: List[List[str]]) -> Table:
        data = [[Paragraph(f"<b>{_p(k)}</b>", self.body), Paragraph(_p(v), self.body)] for k, v in rows]
        t = Table(data, colWidths=[4.6 * cm, 12.4 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), MINT), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return t

    def _bullets(self, items: List[str]) -> List[Paragraph]:
        return [Paragraph(f"•&nbsp;&nbsp;{_p(i)}", self.body) for i in items if i]

    def movement_report(self, patient: Dict[str, Any], analysis: Dict[str, Any], pose: Optional[Dict[str, Any]] = None) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2.6 * cm, bottomMargin=2 * cm,
                                title="MedoShield movement report", author="MedoShield AI")
        va = analysis.get("video_analysis") or {}
        created = analysis.get("created_at")
        story: List[Any] = [
            Paragraph("Movement Assessment Report", self.h1),
            Paragraph("Gait, balance and tremor screening from a smartphone recording", self.sub),
            self._kv([
                ["Patient", f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip() or "-"],
                ["Date of birth", patient.get("date_of_birth") or "-"],
                ["Recorded", created.strftime("%d %b %Y, %H:%M UTC") if hasattr(created, "strftime") else str(created or "-")],
                ["Engine", analysis.get("ai_model") or "MedoShield"],
            ]),
            Paragraph("Scores", self.h2),
        ]
        score_rows = [["Gait quality", va.get("gait_quality_score")], ["Balance", va.get("balance_score")],
                      ["Stride consistency", va.get("stride_consistency")], ["Movement fluidity", va.get("movement_fluidity")]]
        t = Table([["Measure", "Score / 100"]] + [[k, "-" if v is None else str(v)] for k, v in score_rows], colWidths=[11 * cm, 6 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MINT]),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        if pose:
            story += [Paragraph("On-device motion biomarkers", self.h2), self._kv([[k.replace("_", " ").capitalize(), str(v)] for k, v in pose.items() if v is not None][:12])]
        for title, key in (("Summary", "summary"), ("Posture", "posture"), ("Movement", "movement_description")):
            if va.get(key):
                story += [Paragraph(title, self.h2), Paragraph(_p(va[key]), self.body)]
        for title, key in (("Key findings", "key_findings"), ("Areas to watch", "risk_areas"), ("Recommendations", "recommendations")):
            if va.get(key):
                story += [Paragraph(title, self.h2), *self._bullets(va[key])]
        if analysis.get("doctor_notes"):
            story += [Paragraph("Clinician notes", self.h2), Paragraph(_p(analysis["doctor_notes"]), self.body)]
        story += [Spacer(1, 18), Paragraph(
            "This report was produced by AI-assisted analysis of pose keypoints and/or video. It supports, but does not replace, "
            "assessment by a qualified clinician. Do not change any treatment based on this report alone.", self.small)]
        doc.build(story, onFirstPage=self._frame, onLaterPages=self._frame)
        return buf.getvalue()


report_builder = ReportBuilder()
