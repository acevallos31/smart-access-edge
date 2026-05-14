import os
import time
from datetime import datetime, timedelta
from config import EVENTS_DIR, EVENT_RETENTION_DAYS

def cleanup():
    now = datetime.now()
    cutoff = now - timedelta(days=EVENT_RETENTION_DAYS)

    for camera_id in os.listdir(EVENTS_DIR):
        camera_path = os.path.join(EVENTS_DIR, camera_id)

        if not os.path.isdir(camera_path):
            continue

        for file in os.listdir(camera_path):
            filepath = os.path.join(camera_path, file)

            try:
                timestamp_str = file.replace(".jpg", "")
                file_time = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")

                if file_time < cutoff:
                    os.remove(filepath)

            except Exception:
                continue

if __name__ == "__main__":
    while True:
        cleanup()
        time.sleep(3600)  # cada 1 hora
