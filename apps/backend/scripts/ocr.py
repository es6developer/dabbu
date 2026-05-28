#!/usr/bin/env python3
import sys, json, base64, tempfile, os, time
import easyocr

reader = None

def get_reader():
    global reader
    if reader is None:
        reader = easyocr.Reader(['en'], gpu=False)
    return reader

def extract_text(image_path):
    r = get_reader()
    results = r.readtext(image_path, detail=1, paragraph=True, width_ths=0.6, height_ths=0.6)
    lines = []
    full_text = []
    for bbox, text, conf in results:
        lines.append({
            "text": text.strip(),
            "confidence": round(float(conf), 3),
            "bbox": [[float(bbox[0][0]), float(bbox[0][1])], [float(bbox[2][0]), float(bbox[2][1])]]
        })
        full_text.append(text.strip())
    return {
        "success": True,
        "text": "\n".join(full_text),
        "lines": lines,
        "line_count": len(lines),
        "time_ms": 0
    }

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        image_b64 = input_data.get("image", "")
        if not image_b64:
            print(json.dumps({"success": False, "error": "No image data"}))
            sys.exit(0)

        t0 = time.time()
        image_bytes = base64.b64decode(image_b64)

        suffix = input_data.get("ext", ".jpg")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            result = extract_text(tmp_path)
            result["time_ms"] = round((time.time() - t0) * 1000)
            print(json.dumps(result))
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0)
