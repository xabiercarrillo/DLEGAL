"""
XLegal — Generación de PDFs Jurídicos
WeasyPrint: local, sin costo, máxima privacidad (preferido)
DocRaptor: servicio cloud, excelente calidad CSS
PDFShift: alternativa cloud, más económica
CloudConvert: conversión de formatos (Word→PDF)

Uso:
  - Contratos: template HTML → PDF firmable
  - Facturas: genera PDF con membrete del estudio
  - Expedientes: recopila info del caso en PDF
  - Poderes: documentos notariales
"""
import io, httpx
from datetime import datetime
from app.core.config import settings


# ═══════════════════════════════════════════════
#  LOCAL — WeasyPrint
# ═══════════════════════════════════════════════
async def generate_pdf_local(html: str) -> bytes | None:
    """
    Genera PDF desde HTML usando WeasyPrint (local, sin API).
    Requiere: pip install weasyprint
    """
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration

        font_config = FontConfiguration()
        css = CSS(string="""
            @page { size: A4; margin: 2cm; }
            body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #000; }
            h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
            h2 { font-size: 12pt; margin-top: 1.5em; }
            .header { text-align: center; margin-bottom: 2em; border-bottom: 2px solid #000; padding-bottom: 1em; }
            .footer { text-align: center; font-size: 9pt; color: #666; margin-top: 2em; border-top: 1px solid #ccc; }
            .signature-block { margin-top: 4em; display: flex; justify-content: space-between; }
            .signature-line { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 0.5em; }
            table { width: 100%; border-collapse: collapse; margin: 1em 0; }
            td, th { padding: 6px 10px; border: 1px solid #ccc; }
            th { background: #f0f0f0; font-weight: bold; }
        """, font_config=font_config)

        pdf_bytes = HTML(string=html).write_pdf(stylesheets=[css], font_config=font_config)
        return pdf_bytes
    except ImportError:
        return None
    except Exception as e:
        print(f"[PDF WeasyPrint error] {e}")
        return None


# ═══════════════════════════════════════════════
#  DOCRAPTOR (cloud)
# ═══════════════════════════════════════════════
async def generate_pdf_docraptor(html: str, document_name: str = "documento",
                                  api_key: str = None, test: bool = False) -> bytes | None:
    """
    DocRaptor API — Excelente para documentos complejos con CSS avanzado.
    Docs: https://docraptor.com/documentation/api
    Plan free: 5 docs/mes con marca de agua
    """
    key = api_key or ""
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://docraptor.com/docs",
                auth=(key, ""),
                json={
                    "user_credentials": key,
                    "doc": {
                        "document_content": html,
                        "type": "pdf",
                        "test": test,
                        "javascript": True,
                        "name": document_name,
                        "prince_options": {"media": "print"},
                    },
                },
            )
            if r.status_code == 200:
                return r.content
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════
#  PDFSHIFT (cloud)
# ═══════════════════════════════════════════════
async def generate_pdf_pdfshift(html: str, api_key: str = None, sandbox: bool = False) -> bytes | None:
    """
    PDFShift API — Simple y económica.
    Docs: https://pdfshift.io/documentation
    """
    key = api_key or ""
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.pdfshift.io/v3/convert/pdf",
                auth=("api", key),
                json={"source": html, "format": "A4", "margin": "2cm", "sandbox": sandbox},
            )
            if r.status_code == 200:
                return r.content
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════
#  CLOUDCONVERT (Word → PDF)
# ═══════════════════════════════════════════════
async def convert_docx_to_pdf(docx_bytes: bytes, api_key: str = None) -> bytes | None:
    """
    CloudConvert — Convierte Word/DOCX a PDF.
    Docs: https://cloudconvert.com/api/v2
    """
    key = api_key or ""
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Create job
            r = await client.post(
                "https://api.cloudconvert.com/v2/jobs",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "tasks": {
                        "upload": {"operation": "import/upload"},
                        "convert": {"operation": "convert", "input": "upload",
                                    "output_format": "pdf", "engine": "libreoffice"},
                        "export": {"operation": "export/url", "input": "convert"},
                    }
                },
            )
            job = r.json()["data"]
            upload_task = next(t for t in job["tasks"] if t["name"] == "upload")

            # Upload DOCX
            upload_url = upload_task["result"]["form"]["url"]
            form_data = upload_task["result"]["form"]["parameters"]
            form_data["file"] = ("document.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            await client.post(upload_url, data=form_data)

            # Poll for completion (simplified — production uses webhooks)
            import asyncio
            for _ in range(30):
                await asyncio.sleep(2)
                rj = await client.get(f"https://api.cloudconvert.com/v2/jobs/{job['id']}",
                                      headers={"Authorization": f"Bearer {key}"})
                jdata = rj.json()["data"]
                if jdata["status"] == "finished":
                    export_task = next(t for t in jdata["tasks"] if t["name"] == "export")
                    pdf_url = export_task["result"]["files"][0]["url"]
                    pdf_r = await client.get(pdf_url)
                    return pdf_r.content
                elif jdata["status"] == "error":
                    return None
    except Exception:
        return None


# ═══════════════════════════════════════════════
#  HTML TEMPLATES para documentos jurídicos
# ═══════════════════════════════════════════════
def html_invoice(invoice: dict, firm: dict, client: dict, items: list) -> str:
    """Template HTML para factura jurídica con membrete del estudio."""
    items_rows = "".join(
        f"<tr><td>{i['description']}</td><td style='text-align:center'>{i['quantity']}</td>"
        f"<td style='text-align:right'>₲ {i['unit_price']:,.0f}</td>"
        f"<td style='text-align:right'>₲ {i['amount']:,.0f}</td></tr>"
        for i in items
    )
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>
  body {{font-family: 'Times New Roman', serif; font-size: 11pt; margin: 0; padding: 2cm;}}
  .header {{display: flex; justify-content: space-between; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px;}}
  .firm-name {{font-size: 18pt; font-weight: bold; color: #1a1a2e;}}
  .invoice-title {{font-size: 22pt; font-weight: bold; color: #c9a84c; text-align: right;}}
  table {{width: 100%; border-collapse: collapse; margin: 16px 0;}}
  th {{background: #1a1a2e; color: white; padding: 8px 12px; text-align: left;}}
  td {{padding: 8px 12px; border-bottom: 1px solid #eee;}}
  .totals {{margin-left: auto; width: 300px;}}
  .total-row {{display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee;}}
  .total-final {{font-weight: bold; font-size: 14pt; color: #1a1a2e; border-top: 2px solid #1a1a2e; padding-top: 8px;}}
  .footer {{margin-top: 40px; font-size: 9pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 12px;}}
  .timbrado {{background: #f8f8f8; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 10pt;}}
</style></head><body>
<div class="header">
  <div>
    <div class="firm-name">{firm.get('name','')}</div>
    <div style="color:#666; margin-top:4px">{firm.get('legal_name','')}</div>
    <div>RUC: {firm.get('ruc','')}</div>
    <div>{firm.get('address','')}, {firm.get('city','Asunción')}</div>
    <div>Tel: {firm.get('phone','')} | {firm.get('email','')}</div>
  </div>
  <div style="text-align:right">
    <div class="invoice-title">FACTURA</div>
    <div class="timbrado" style="margin-top:8px">
      <strong>N° {invoice.get('number','')}</strong><br>
      Timbrado: {invoice.get('timbrado','')}<br>
      Fecha emisión: {invoice.get('issued_at','')}<br>
      Tipo: Factura {invoice.get('invoice_type','B')}
    </div>
  </div>
</div>

<div style="margin: 16px 0; padding: 12px; background: #f8f8f8; border-radius: 4px;">
  <strong>CLIENTE:</strong> {client.get('full_name','')}<br>
  RUC/CI: {client.get('ruc') or client.get('document_number','')}<br>
  Dirección: {client.get('address','')}<br>
  Email: {client.get('email','')}
</div>

<table>
  <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio Unit.</th><th>Total</th></tr></thead>
  <tbody>{items_rows}</tbody>
</table>

<div class="totals">
  <div class="total-row"><span>Subtotal:</span><span>₲ {invoice.get('subtotal',0):,.0f}</span></div>
  <div class="total-row"><span>IVA ({invoice.get('iva_rate',10):.0f}%):</span><span>₲ {invoice.get('iva_amount',0):,.0f}</span></div>
  <div class="total-row total-final"><span>TOTAL:</span><span>₲ {invoice.get('total',0):,.0f}</span></div>
</div>

{f'<div style="margin-top:16px"><strong>Notas:</strong> {invoice.get("notes","")}</div>' if invoice.get('notes') else ''}

<div class="footer">
  {firm.get('name','')} — {firm.get('address','')} — Tel: {firm.get('phone','')}<br>
  Documento generado por XLegal — Sistema Jurídico Paraguay 🇵🇾
</div></body></html>"""


def html_contract(title: str, parties: list, clauses: list, firm: dict, date: str = None) -> str:
    """Template HTML para contrato jurídico."""
    date_str = date or datetime.now().strftime("%d de %B de %Y")
    parties_html = "".join(
        f"<p><strong>{p.get('role','Parte').upper()}:</strong> {p.get('name','')}, "
        f"CI/RUC: {p.get('document','')}, domiciliado en {p.get('address','')}, "
        f"en adelante denominado <em>\"{p.get('alias', p.get('role','Parte'))}\"</em>.</p>"
        for p in parties
    )
    clauses_html = "".join(
        f"<p><strong>CLÁUSULA {i+1}a. — {c.get('title','').upper()}:</strong><br>{c.get('content','')}</p>"
        for i, c in enumerate(clauses)
    )
    sigs = "".join(
        f'<div style="width:45%;text-align:center;"><div style="border-top:1px solid #000;margin-top:60px;padding-top:8px;">'
        f'{p.get("name","")}<br><small>{p.get("role","")}</small></div></div>'
        for p in parties
    )
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>
  body {{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.8;margin:0;padding:2cm;color:#000;}}
  h1 {{font-size:14pt;text-align:center;text-transform:uppercase;letter-spacing:2px;margin:0 0 24px;}}
  .header-line {{border-bottom:3px double #000;margin-bottom:24px;padding-bottom:12px;text-align:center;}}
  .article {{margin:16px 0;}}
  .signatures {{display:flex;justify-content:space-between;margin-top:60px;}}
  .footer {{font-size:9pt;color:#666;border-top:1px solid #ccc;margin-top:40px;padding-top:12px;text-align:center;}}
</style></head><body>
<div class="header-line">
  <h1>{title}</h1>
  <p>En la ciudad de Asunción, República del Paraguay, a los {date_str}.</p>
</div>
<p><strong>REUNIDOS Y COMPARECIENTES:</strong></p>
{parties_html}
<p>Las partes, de mutuo acuerdo, convienen en celebrar el presente contrato sujeto a las siguientes cláusulas y condiciones:</p>
{clauses_html}
<div class="signatures">{sigs}</div>
<div class="footer">
  Preparado por: {firm.get('name','')} — {firm.get('address','')} — Tel: {firm.get('phone','')}<br>
  Documento generado por XLegal — Sistema Jurídico Paraguay 🇵🇾
</div></body></html>"""


async def generate_pdf(html: str, provider: str = "local", api_key: str = None) -> bytes | None:
    """
    Genera PDF usando el proveedor configurado.
    Fallback: local → docraptor → pdfshift
    """
    if provider == "docraptor":
        pdf = await generate_pdf_docraptor(html, api_key=api_key)
    elif provider == "pdfshift":
        pdf = await generate_pdf_pdfshift(html, api_key=api_key)
    else:
        pdf = await generate_pdf_local(html)

    # Fallback chain
    if not pdf:
        pdf = await generate_pdf_local(html)

    return pdf
