import io
import os
import time
from typing import List
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes
from .ocr_preprocess import preprocess_for_ocr
import PyPDF2


_TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if _TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = _TESSERACT_CMD

ALLOWED_MIME = {"application/pdf", "image/png", "image/jpeg", "image/jpg", "image/tiff"}


def ocr_pages_from_bytes(data: bytes, mime_type: str, lang: str = "eng"):
    t0 = time.time()
    pil_pages: List[Image.Image] = []

    # Prefer native PDF text extraction for medical PDFs, fall back to OCR
    if mime_type.lower() in ("application/pdf", "pdf"):
        native_results = []
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(data))
            for idx, page in enumerate(reader.pages, start=1):
                txt = page.extract_text() or ""
                native_results.append({
                    "page_number": idx,
                    "text": txt,
                    "mean_confidence": 1.0 if txt.strip() else 0.0,
                    "deskew_angle": 0.0,
                })
            native_full_text = "\n\n".join([r["text"] for r in native_results]).strip()
            if native_full_text:
                processing_ms = int((time.time() - t0) * 1000)
                return native_results, native_full_text, processing_ms
        except Exception:
            # If native extraction fails, proceed to image OCR fallback
            pass

        # Fallback: render PDF pages to images and OCR
        pil_pages = convert_from_bytes(data, fmt="png", dpi=300)
    else:
        pil_pages = [Image.open(io.BytesIO(data)).convert("RGB")]

    results = []
    for idx, p in enumerate(pil_pages, start=1):
        pre_img, angle = preprocess_for_ocr(p)
        pre_pil = Image.fromarray(pre_img)
        data_dict = pytesseract.image_to_data(pre_pil, lang=lang, output_type=pytesseract.Output.DICT)
        confs = [int(c) for c in data_dict.get("conf", []) if str(c) not in ("-1", "-1.0")]
        mean_conf = float(sum(confs) / len(confs)) if confs else 0.0
        text = pytesseract.image_to_string(pre_pil, lang=lang)
        results.append({
            "page_number": idx,
            "text": text,
            "mean_confidence": round(mean_conf, 2),
            "deskew_angle": round(angle, 2),
        })

    processing_ms = int((time.time() - t0) * 1000)
    full_text = "\n\n".join([r["text"] for r in results])
    return results, full_text, processing_ms


