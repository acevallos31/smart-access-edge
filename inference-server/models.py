from sqlalchemy import Column, Integer, String, Boolean, JSON
from database import Base


class Event(Base):

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    camera_id = Column(String)
    camera_name = Column(String)
    event_type = Column(String)

    persons = Column(Integer)
    timestamp = Column(String)

    snapshot_url = Column(String)

    stable_detection = Column(Boolean)

    person_boxes = Column(JSON, nullable=True)
    recognized_faces = Column(JSON, nullable=True)
