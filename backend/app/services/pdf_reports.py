# backend/app/services/pdf_reports.py
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

NAVY = colors.HexColor("#1B3A5C")
GREEN = colors.HexColor("#2F9E6E")
LIGHT_BG = colors.HexColor("#F5F7F9")
BORDER = colors.HexColor("#D8DEE4")

MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


def _doc(buffer):
    return SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm,
                              leftMargin=20 * mm, rightMargin=20 * mm)


def _summary_table_style():
    return TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_BG),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ])


def generate_accounting_summary_pdf(summary: dict) -> bytes:
    buffer = io.BytesIO()
    doc = _doc(buffer)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('EEBTitle', parent=styles['Title'], textColor=NAVY)

    elements = [
        Paragraph("EEB — Accounting Summary", title_style),
        Paragraph(f"Generated {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')}", styles['Normal']),
        Spacer(1, 14),
    ]

    def fmt(key):
        val = summary.get(key)
        return f"£{val}" if val is not None else "—"

    rows = [
        ["Owed by Employers", fmt("total_owed_by_employers")],
        ["Owed to Merchants", fmt("total_owed_to_merchants")],
        ["Disputed", f"{fmt('total_disputed')} ({summary.get('disputed_count', 0)} open)"],
        ["Employer Arrears", fmt("total_employer_arrears")],
        ["Collected from Employers", fmt("total_collected_from_employers")],
        ["Paid to Merchants", fmt("total_paid_to_merchants")],
        ["Book Balance (computed)", fmt("book_balance")],
        ["Bank Balance (recorded)", fmt("bank_balance") if summary.get("bank_balance") is not None else "Not recorded"],
        ["Discrepancy", fmt("discrepancy") if summary.get("discrepancy") is not None else "—"],
    ]
    table = Table(rows, colWidths=[85 * mm, 75 * mm])
    table.setStyle(_summary_table_style())
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()


def generate_settlement_statement_pdf(settlement: dict, business_name: str, transactions: list) -> bytes:
    buffer = io.BytesIO()
    doc = _doc(buffer)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('EEBTitle', parent=styles['Title'], textColor=NAVY)

    period_label = f"{MONTH_NAMES[settlement['period_month']]} {settlement['period_year']}"
    elements = [
        Paragraph("EEB — Merchant Settlement Statement", title_style),
        Paragraph(business_name, styles['Heading2']),
        Paragraph(f"Period: {period_label} · Due: {settlement['due_date']}", styles['Normal']),
        Spacer(1, 14),
    ]

    summary_rows = [
        ["Total Amount", f"£{settlement['total_amount']}"],
        ["Status", str(settlement['status']).replace('_', ' ').title()],
        ["Paid At", settlement.get('paid_at') or "Not yet paid"],
        ["Reference", settlement.get('paid_reference') or "—"],
    ]
    summary_table = Table(summary_rows, colWidths=[55 * mm, 105 * mm])
    summary_table.setStyle(_summary_table_style())
    elements.append(summary_table)
    elements.append(Spacer(1, 18))

    if transactions:
        elements.append(Paragraph("Included Transactions", styles['Heading3']))
        elements.append(Spacer(1, 6))
        txn_data = [["Date", "Code", "Amount"]] + [
            [t['date'], t['code'], f"£{t['amount']}"] for t in transactions
        ]
        txn_table = Table(txn_data, colWidths=[55 * mm, 55 * mm, 50 * mm])
        txn_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), NAVY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(txn_table)

    doc.build(elements)
    return buffer.getvalue()
