from crud import save_event
from face_service import recognize_faces
from event_bus import publish_event

import time
import av
import os
import cv2
import requests

from config import (
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


INFERENCE_API_URL = os.getenv(
    "INFERENCE_API_URL",
    "http://127.0.0.1:8001/detect"
)
INFERENCE_TIMEOUT = (2, 8)



def camera_worker(camera_id, camera_config):
    camera_name = camera_config["name"]
    rtsp_url = camera_config["rtsp"]

    width = camera_config.get("width", 640)
    height = camera_config.get("height", 360)


    snapshot_path = f"{SNAPSHOT_DIR}/{camera_id}.jpg"
    snapshot_url = f"{PUBLIC_BASE_URL}/snapshot/{camera_id}"
    event_dir = f"{EVENTS_DIR}/{camera_id}"

    os.makedirs(event_dir, exist_ok=True)

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
        "last_event": None,
        "rtsp_timeouts": 0,
        "last_frame_time": None
    }

    with requests.Session() as session:
        while True:
            container = None

            try:
                container = av.open(
                    rtsp_url,
                    options={"rtsp_transport": "tcp"},
                    timeout=(10.0, 15.0)
                )

                camera_status[camera_id]["camera_connected"] = True
                camera_status[camera_id]["last_error"] = None

                for video_frame in container.decode(video=0):
                    frame = video_frame.to_ndarray(format="bgr24")
                    frame = cv2.resize(frame, (width, height))

                    try:
                        encoded_ok, encoded_frame = cv2.imencode(
                            ".jpg",
                            frame,
                            [cv2.IMWRITE_JPEG_QUALITY, 85]
                        )
                        if not encoded_ok:
                            raise ValueError("JPEG encoding failed")

                        response = session.post(
                            INFERENCE_API_URL,
                            files={
                                "file": (
                                    "frame.jpg",
                                    encoded_frame.tobytes(),
                                    "image/jpeg"
                                )
                            },
                            timeout=INFERENCE_TIMEOUT
                        )
                        response.raise_for_status()

                        result = response.json()
                        detections = result.get("detections")
                        if not isinstance(detections, list):
                            raise ValueError("Invalid inference response")
                        camera_status[camera_id]["last_error"] = None

                    except (requests.RequestException, ValueError, TypeError) as exc:
                        camera_status[camera_id]["last_error"] = (
                            f"Inference API error: {exc}"
                        )
                        # A failed inference breaks the detection streak.
                        # It is not interpreted as a negative detection.
                        detection_counter = 0
                        camera_status[camera_id]["detection_counter"] = 0
                        camera_status[camera_id]["stable_detection"] = False
                        time.sleep(1)
                        continue

                    person_count = 0
                    person_boxes = []

                    for obj in detections:
                        if int(obj["class_id"]) != PERSON_CLASS_ID:
                            continue

                        score = float(obj["score"])
                        if score < CONFIDENCE_THRESHOLD:
                            continue

                        bbox = obj["bbox"]
                        xmin = max(0, min(width, int(bbox["xmin"])))
                        ymin = max(0, min(height, int(bbox["ymin"])))
                        xmax = max(0, min(width, int(bbox["xmax"])))
                        ymax = max(0, min(height, int(bbox["ymax"])))

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
                    camera_status[camera_id]["last_frame_time"] = time.time()

                    if camera_status[camera_id]["frames"] % 5 == 0:
                        temp_snapshot = f"{snapshot_path}.writing.jpg"
                        cv2.imwrite(temp_snapshot, frame)
                        os.replace(temp_snapshot, snapshot_path)
                        camera_status[camera_id]["last_snapshot"] = snapshot_url

                    now = time.time()

                    if (
                        stable_detection
                        and (now - last_event_time) >= EVENT_COOLDOWN_SECONDS
                    ):
                        timestamp = time.strftime("%Y%m%d_%H%M%S")
                        event_snapshot_path = f"{event_dir}/{timestamp}.jpg"
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
                        cv2.imwrite(temp_event, frame)
                        os.replace(temp_event, event_snapshot_path)

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

                raise EOFError("RTSP stream ended")

            except (TimeoutError, av.error.TimeoutError) as exc:
                camera_status[camera_id]["camera_connected"] = False
                camera_status[camera_id]["last_error"] = str(exc)
                camera_status[camera_id]["rtsp_timeouts"] += 1
                print("RTSP watchdog timeout: " + camera_id, flush=True)
                time.sleep(3)

            except Exception as exc:
                camera_status[camera_id]["camera_connected"] = False
                camera_status[camera_id]["last_error"] = str(exc)
                time.sleep(5)

            finally:
                if container is not None:
                    container.close()
