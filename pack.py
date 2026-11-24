"""Bundle the static editor and its sample media into one portable HTML file."""
from base64 import b64encode
from pathlib import Path
import re

APP = Path(__file__).resolve().parent
DESTINATION = APP / "offline" / "tonepress.html"


def data_url(filename, mime):
    encoded = b64encode((APP / "assets" / filename).read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def main():
    page = (APP / "index.html").read_text(encoding="utf-8")
    def inline_style(tag):
        css = (APP / tag[1]).read_text(encoding="utf-8")
        return f"<style>\n{css}\n</style>"

    page = re.sub(r'<link rel="stylesheet" href="([\w-]+\.css)">', inline_style, page)
    page = page.replace("assets/crt-poster.webp", data_url("crt-poster.webp", "image/webp"))
    photo = data_url("coast.jpg", "image/jpeg")
    clip = data_url("coast-motion.mp4", "video/mp4")
    media = f"<script>window.TONEPRESS_SAMPLE='{photo}';window.TONEPRESS_CLIP='{clip}';</script>"
    page = page.replace('<script src="halftone.js">', media + '\n<script src="halftone.js">')
    for name in ("ui-i18n.js", "catalog-i18n.js", "workspace-i18n.js", "locale.js", "screens.js", "halftone.js", "effects-extra.js", "kits.js", "kit-type.js", "kit-print.js", "kit-optics.js", "kit-tracking.js", "effects.js", "looks.js", "controls.js", "workspace.js", "export.js", "crt-artwork.js", "crt-model.js", "crt-view.js", "app.js"):
        source = (APP / name).read_text(encoding="utf-8").replace("</script", "<\\/script")
        page = page.replace(f'<script src="{name}"></script>', f"<script>\n{source}\n</script>")
    DESTINATION.parent.mkdir(exist_ok=True)
    DESTINATION.write_bytes(page.encode("utf-8"))
    print(f"{DESTINATION.name} — {DESTINATION.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
