from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response

import cv2
import os

from config import (
    camera_status,
    SNAPSHOT_DIR,
    EVENTS_DIR
)

from event_bus import (
    register_client,
    remove_client
)


def create_api():

    app = FastAPI(title="AI Inference Server")

    @app.get("/")
    def root():
        return {"status": "running"}

    @app.get("/status")
    def get_status():
        return camera_status

    @app.get("/status/{camera_id}")
    def get_camera_status(camera_id: str):

        if camera_id not in camera_status:

            raise HTTPException(
                status_code=404,
                detail="Camera not found"
            )

        return camera_status[camera_id]

    @app.get("/snapshot/{camera_id}")
    def snapshot(camera_id: str):

        return FileResponse(
            f"{SNAPSHOT_DIR}/{camera_id}.jpg"
        )

    @app.get("/events/{camera_id}/{filename}")
    def event_snapshot(camera_id: str, filename: str):

        return FileResponse(
            f"{EVENTS_DIR}/{camera_id}/{filename}"
        )

    @app.get("/events/{camera_id}/{filename}/crop/{box_index}")
    def event_crop(
        camera_id: str,
        filename: str,
        box_index: int
    ):

        image_path = f"{EVENTS_DIR}/{camera_id}/{filename}"

        if not os.path.exists(image_path):

            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )

        event = camera_status.get(
            camera_id,
            {}
        ).get(
            "last_event"
        )

        if not event:

            raise HTTPException(
                status_code=404,
                detail="Event metadata not found"
            )

        boxes = event.get("personBoxes", [])

        if box_index >= len(boxes):

            raise HTTPException(
                status_code=404,
                detail="Box not found"
            )

        box = boxes[box_index]

        image = cv2.imread(image_path)

        xmin = max(int(box["xmin"]), 0)
        ymin = max(int(box["ymin"]), 0)

        xmax = min(
            int(box["xmax"]),
            image.shape[1]
        )

        ymax = min(
            int(box["ymax"]),
            image.shape[0]
        )

        crop = image[ymin:ymax, xmin:xmax]

        ok, encoded = cv2.imencode(
            ".jpg",
            crop
        )

        if not ok:

            raise HTTPException(
                status_code=500,
                detail="Could not encode crop"
            )

        return Response(
            content=encoded.tobytes(),
            media_type="image/jpeg"
        )

    @app.websocket("/ws/events")
    async def websocket_events(
        websocket: WebSocket
    ):

        await register_client(websocket)

        try:

            while True:
                await websocket.receive_text()

        except WebSocketDisconnect:
            remove_client(websocket)

    return app
