"""Build a portable copy of Tonepress with samples, the portrait model and its licenses."""
from base64 import b64encode
from html import escape
from pathlib import Path
import re

APP = Path(__file__).resolve().parent
DESTINATION = APP / "offline" / "tonepress.html"


def encoded(path):
    return b64encode(path.read_bytes()).decode("ascii")


def main():
    page = (APP / "index.html").read_text(encoding="utf-8")
    def inline_style(tag):
        return "<style>\n" + (APP / tag[1]).read_text(encoding="utf-8") + "\n</style>"

    def inline_script(tag):
        code = (APP / tag[1]).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>\n" + code + "\n</script>"

    page = re.sub(r'<link rel="stylesheet" href="([\w-]+\.css)">', inline_style, page)
    assets = APP / "assets"
    page = page.replace("assets/crt-poster.webp", "data:image/webp;base64," + encoded(assets / "crt-poster.webp"))
    photo = "data:image/jpeg;base64," + encoded(assets / "coast.jpg")
    clip = "data:video/mp4;base64," + encoded(assets / "coast-motion.mp4")
    samples = f"<script>window.TONEPRESS_SAMPLE='{photo}';window.TONEPRESS_CLIP='{clip}';</script>"
    page = page.replace('<script src="halftone.js">', samples + '\n<script src="halftone.js">')
    person = assets / "person"
    bundles = [f'<script type="application/octet-stream" id="person-file-{i}">{encoded(person / name)}</script>'
               for i, name in enumerate(["tf.min.js", "model-data.js"])]
    legal = "\n\n".join((person / name).read_text(encoding="utf-8") for name in ["NOTICE","LICENSE"])
    bundles.append('<pre hidden id="third-party-notices">' + escape(legal) + '</pre>')
    page = page.replace('<script src="person-loader.js">', "\n".join(bundles) + '\n<script src="person-loader.js">')
    page = re.sub(r'<script src="([\w-]+\.js)"></script>', inline_script, page)
    DESTINATION.parent.mkdir(exist_ok=True)
    DESTINATION.write_bytes(page.encode("utf-8"))
    print(f"{DESTINATION.name} — {DESTINATION.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
