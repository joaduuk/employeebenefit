# backend/app/services/export.py
"""
Generic tabular export — takes rows already prepared as plain dicts
(the same shape you'd return as JSON) and turns them into a downloadable
CSV, XLSX, or JSON file. One shared implementation used by every export
endpoint, so behaviour (column ordering, filename pattern, empty-list
handling) stays identical everywhere rather than reimplemented per page.
"""
import csv
import io
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill


def _xlsx_safe(value: Any) -> Any:
    """
    openpyxl only accepts plain types in a cell (str, int, float, bool,
    date/datetime — those it handles natively with real Excel date
    formatting). Anything else (UUID, Decimal, or any object that got
    here without already being converted) gets stringified rather than
    raising. This is a safety net — the actual fix belongs at the source
    (use model_dump(mode="json") when converting Pydantic models), but
    this protects every export from ever hard-failing on a stray type.
    """
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool, date, datetime)):
        return value
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    return str(value)


def rows_to_csv_response(rows: List[Dict[str, Any]], filename: str) -> Response:
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


def rows_to_xlsx_response(rows: List[Dict[str, Any]], filename: str) -> Response:
    wb = Workbook()
    ws = wb.active
    if rows:
        headers = list(rows[0].keys())
        ws.append(headers)
        header_fill = PatternFill(start_color="1B3A5C", end_color="1B3A5C", fill_type="solid")
        for cell in ws[1]:
            cell.font = Font(color="FFFFFF", bold=True)
            cell.fill = header_fill
        for row in rows:
            ws.append([_xlsx_safe(row.get(h, "")) for h in headers])
        for col in ws.columns:
            max_len = max((len(str(c.value)) for c in col if c.value is not None), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    output = io.BytesIO()
    wb.save(output)
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
    )


def rows_to_json_response(rows: List[Dict[str, Any]], filename: str) -> Response:
    return Response(
        content=json.dumps(rows, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}.json"'},
    )


def export_response(rows: List[Dict[str, Any]], filename: str, format: str) -> Response:
    if format == "csv":
        return rows_to_csv_response(rows, filename)
    if format == "xlsx":
        return rows_to_xlsx_response(rows, filename)
    return rows_to_json_response(rows, filename)
