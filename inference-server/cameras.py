from pathlib import Path
from urllib.parse import quote

EZVIZ_PASSWORD = Path(
    "/root/ezviz-rtsp.secret"
).read_text().strip()


CAMERAS = {
    "entrada01": {
        "name": "Entrada Principal",
        "rtsp": (
            "rtsp://admin:"
            + quote(EZVIZ_PASSWORD, safe="")
            + "@192.168.1.176:554/Streaming/Channels/101"
        ),
        "width": 640,
        "height": 360,
    }
}
