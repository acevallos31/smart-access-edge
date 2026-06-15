from crud import save_event
from face_service import recognize_faces
from event_bus import publish_event

import time
import subprocess
import os
import numpy as np
import cv2
import requests

from pycoral.adapters import common, detect
from pycoral.utils.edgetpu import make_interpreter

from config import (
    MODEL_PATH,
    PERSON_CLASS_ID,
    CONFIDENCE_THRESHOLD,
    MIN_BOX_WIDTH,
    MIN_BOX_HEIGHT,
    DETECTION_STREAK,
    BACKEND_URL,
    SITE_ID,
    EVENT_COOLDOWN_SECONDS,
    PUBLIC_BASE_URL,
    SNAPSHOT_DIR,
    EVENTS_DIR,
    camera_status
)


def camera_worker(camera_id, camera_config):

    camera_name = camera_config["name"]
    rtsp_url = camera_config["rtsp"]

    width = camera_config.get("width", 640)
    height = camera_config.get("height", 360)

    channels = 3
    frame_size = width * height * channels

    snapshot_path = f"{SNAPSHOT_DIR}/{camera_id}.jpg"
    snapshot_url = f"{PUBLIC_BASE_URL}/snapshot/{camera_id}"

    event_dir = f"{EVENTS_DIR}/{camera_id}"

    os.makedirs(event_dir, exist_ok=True)

    interpreter = make_interpreter(MODEL_PATH)
    interpreter.allocate_tensors()

    input_width, input_height = common.input_size(interpreter)

    last_event_time = 0
    detection_counter = 0

    camera_status[camera_id] = {
        "camera_id": camera_id,
        "camera_name": camera_name,
        "camera_connected": False,
        "frames": 0,
        "persons": 0,
        "stable_detection": False,
        "detection_counter": 0,
        "last_error": None,
        "last_snapshot": None,
        "last_event": None
    }

    while True:

        try:

            cmd = [
                "ffmpeg",
                "-rtsp_transport", "tcp",
                "-i", rtsp_url,
                "-loglevel", "quiet",
                "-an",
                "-vf", f"scale={width}:{height}",
                "-pix_fmt", "bgr24",
                "-vcodec", "rawvideo",
                "-f", "image2pipe",
                "-"
            ]

            pipe = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=10**8
            )

            camera_status[camera_id]["camera_connected"] = True
            camera_status[camera_id]["last_error"] = None

            while True:

                raw_frame = pipe.stdout.read(frame_size)

                if not raw_frame:

                    camera_status[camera_id]["camera_connected"] = False
                    camera_status[camera_id]["last_error"] = "Stream caído"

                    break

                frame = np.frombuffer(
                    raw_frame,
                    np.uint8
                ).reshape((height, width, 3))

                rgb_frame = cv2.cvtColor(
                    frame,
                    cv2.COLOR_BGR2RGB
                )

                resized = cv2.resize(
                    rgb_frame,
                    (input_width, input_height)
                )

                common.set_input(
                    interpreter,
                    resized
                )

                interpreter.invoke()

                detections = detect.get_objects(
                    interpreter,
                    CONFIDENCE_THRESHOLD
                )

                person_count = 0

                scale_x = width / input_width
                scale_y = height / input_height

                person_boxes = []

                for obj in detections:

                    if obj.id != PERSON_CLASS_ID:
                        continue

                    score = obj.score

                    if score < CONFIDENCE_THRESHOLD:
                        continue

                    bbox = obj.bbox

                    xmin = int(bbox.xmin * scale_x)
                    ymin = int(bbox.ymin * scale_y)
                    xmax = int(bbox.xmax * scale_x)
                    ymax = int(bbox.ymax * scale_y)

                    box_width = xmax - xmin
                    box_height = ymax - ymin

                    if box_width < MIN_BOX_WIDTH:
                        continue

                    if box_height < MIN_BOX_HEIGHT:
                        continue

                    person_boxes.append({
                        "xmin": xmin,
                        "ymin": ymin,
                        "xmax": xmax,
                        "ymax": ymax,
                        "score": round(float(score), 3)
                    })

                    person_count += 1

                    cv2.rectangle(
                        frame,
                        (xmin, ymin),
                        (xmax, ymax),
                        (0, 255, 0),
                        2
                    )

                    label = f"Persona {score:.2f}"

                    cv2.putText(
                        frame,
                        label,
                        (xmin, max(ymin - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2
                    )

                if person_count > 0:
                    detection_counter += 1
                else:
                    detection_counter = 0

                stable_detection = (
                    detection_counter >= DETECTION_STREAK
                )

                camera_status[camera_id]["persons"] = person_count
                camera_status[camera_id]["stable_detection"] = stable_detection
                camera_status[camera_id]["detection_counter"] = detection_counter
                camera_status[camera_id]["frames"] += 1

                if camera_status[camera_id]["frames"] % 5 == 0:

                    temp_snapshot = f"{snapshot_path}.writing.jpg"

                    cv2.imwrite(
                        temp_snapshot,
                        frame
                    )

                    os.replace(
                        temp_snapshot,
                        snapshot_path
                    )

                    camera_status[camera_id]["last_snapshot"] = snapshot_url

                now = time.time()

                if (
                    stable_detection
                    and (
                        now - last_event_time
                    ) >= EVENT_COOLDOWN_SECONDS
                ):

                    timestamp = time.strftime(
                        "%Y%m%d_%H%M%S"
                    )

                    event_snapshot_path = (
                        f"{event_dir}/{timestamp}.jpg"
                    )

                    event_snapshot_url = (
                        f"{PUBLIC_BASE_URL}/events/"
                        f"{camera_id}/{timestamp}.jpg"
                    )

                    recognized_faces = recognize_faces(frame)

                    for face in recognized_faces:

                        box = face["box"]

                        name = face["name"]

                        confidence = face["confidence"]

                        cv2.rectangle(
                            frame,
                            (box["left"], box["top"]),
                            (box["right"], box["bottom"]),
                            (255, 0, 0),
                            2
                        )

                        cv2.putText(
                            frame,
                            f"{name} {confidence}",
                            (box["left"], max(box["top"] - 10, 20)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (255, 0, 0),
                            2
                        )

                    temp_event = f"{event_snapshot_path}.writing.jpg"

                    cv2.imwrite(
                        temp_event,
                        frame
                    )

                    os.replace(
                        temp_event,
                        event_snapshot_path
                    )

                    event_data = {
                        "cameraId": camera_id,
                        "cameraName": camera_name,
                        "siteId": SITE_ID,
                        "eventType": "PERSON_DETECTED",
                        "persons": person_count,
                        "timestamp": timestamp,
                        "snapshotPath": event_snapshot_path,
                        "snapshotUrl": event_snapshot_url,
                        "stableDetection": stable_detection,
                        "detectionCounter": detection_counter,
                        "recognizedFaces": recognized_faces,
                        "personBoxes": person_boxes
                    }

                    camera_status[camera_id]["last_event"] = event_data

                    last_event_time = now

                    publish_event(event_data)

                    save_event(event_data)

                time.sleep(0.2)

        except Exception as e:

            camera_status[camera_id]["camera_connected"] = False

            camera_status[camera_id]["last_error"] = str(e)

            time.sleep(5)
