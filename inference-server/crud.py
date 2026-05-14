from database import SessionLocal
from models import Event


def save_event(event_data):

    db = SessionLocal()

    try:

        db_event = Event(
            camera_id=event_data["cameraId"],
            camera_name=event_data["cameraName"],
            event_type=event_data["eventType"],
            persons=event_data["persons"],
            timestamp=event_data["timestamp"],
            snapshot_url=event_data["snapshotUrl"],
            stable_detection=event_data["stableDetection"]
            person_boxes=event_data.get("personBoxes", []),
            recognized_faces=event_data.get("recognizedFaces", [])
        )

        db.add(db_event)

        db.commit()

    finally:

        db.close()
