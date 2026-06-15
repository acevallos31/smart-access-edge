import threading
import asyncio

from api import create_api
from camera_worker import camera_worker
from cameras import CAMERAS
from event_bus import set_loop

app = create_api()


@app.on_event("startup")
async def startup_event():
    set_loop(asyncio.get_running_loop())

    for camera_id, camera_config in CAMERAS.items():
        threading.Thread(
            target=camera_worker,
            args=(camera_id, camera_config),
            daemon=True
        ).start()
