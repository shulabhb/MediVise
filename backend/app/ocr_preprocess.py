import cv2
import numpy as np
from PIL import Image


def preprocess_for_ocr(pil_image: Image.Image):
    img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    scale = 1.5 if max(h, w) < 1200 else 1.0
    if scale != 1.0:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    den = cv2.fastNlMeansDenoising(gray, h=7)
    thr = cv2.threshold(den, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thr > 0))
    angle = 0.0
    if coords.size:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
    h2, w2 = thr.shape
    M = cv2.getRotationMatrix2D((w2 // 2, h2 // 2), float(angle), 1.0)
    deskew = cv2.warpAffine(thr, M, (w2, h2), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    out = cv2.cvtColor(deskew, cv2.COLOR_GRAY2RGB)
    return out, float(angle)


