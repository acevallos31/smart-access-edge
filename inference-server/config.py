MODEL_PATH = "/opt/inference-server/models/ssd_mobilenet_v2_coco_quant_postprocess_edgetpu.tflite"

PERSON_CLASS_ID = 0
CONFIDENCE_THRESHOLD = 0.75
MIN_BOX_WIDTH = 40
MIN_BOX_HEIGHT = 40
DETECTION_STREAK = 3

BACKEND_URL = ""
SITE_ID = "CASA"
EVENT_COOLDOWN_SECONDS = 30

PUBLIC_BASE_URL = "https://inference-api.nocpbx.com"

SNAPSHOT_DIR = "/opt/inference-server/snapshots"

EVENTS_DIR = "/opt/inference-server/events"

camera_status = {}

EVENT_RETENTION_DAYS = 15

# Face Recognition

FACE_MATCH_THRESHOLD = 0.52

KNOWN_FACES_DIR = "/opt/inference-server/known_faces"

FACE_DATA_FILE = "/opt/inference-server/face_data/known_faces.pkl"
