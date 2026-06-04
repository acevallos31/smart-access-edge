import os
import pickle
import face_recognition
from config import KNOWN_FACES_DIR, FACE_DATA_FILE, FACE_MATCH_THRESHOLD


def build_face_database():
    known_encodings = []
    known_names = []

    for person_name in os.listdir(KNOWN_FACES_DIR):
        person_dir = os.path.join(KNOWN_FACES_DIR, person_name)

        if not os.path.isdir(person_dir):
            continue

        for file in os.listdir(person_dir):
            if not file.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            image_path = os.path.join(person_dir, file)
            image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(image)

            if len(encodings) == 0:
                print(f"No se encontró rostro en: {image_path}")
                continue

            known_encodings.append(encodings[0])
            known_names.append(person_name)

            print(f"Rostro registrado: {person_name} -> {file}")

    data = {
        "encodings": known_encodings,
        "names": known_names
    }

    with open(FACE_DATA_FILE, "wb") as f:
        pickle.dump(data, f)

    print("Base facial generada correctamente")


def load_face_database():
    if not os.path.exists(FACE_DATA_FILE):
        return {
            "encodings": [],
            "names": []
        }

    with open(FACE_DATA_FILE, "rb") as f:
        return pickle.load(f)


FACE_DB = load_face_database()


def recognize_faces(frame):
    rgb_frame = frame[:, :, ::-1]

    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    recognized = []

    for face_encoding, location in zip(face_encodings, face_locations):
        name = "unknown"
        confidence = 0.0

        if len(FACE_DB["encodings"]) > 0:
            distances = face_recognition.face_distance(
                FACE_DB["encodings"],
                face_encoding
            )

            best_index = distances.argmin()
            best_distance = distances[best_index]

            if best_distance <= FACE_MATCH_THRESHOLD:
                name = FACE_DB["names"][best_index]
                confidence = round(1 - float(best_distance), 3)

        top, right, bottom, left = location

        recognized.append({
            "name": name,
            "confidence": confidence,
            "box": {
                "top": top,
                "right": right,
                "bottom": bottom,
                "left": left
            }
        })

    return recognized
