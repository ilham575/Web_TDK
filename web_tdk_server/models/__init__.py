from .user import User
from .announcement import Announcement
from .document import Document
from .school import School
from .subject import Subject

# Add relationships to User model
from sqlalchemy.orm import relationship

# Add back_populates relationships to User
User.announcements = relationship("Announcement", back_populates="author")
User.documents = relationship("Document", back_populates="uploader")
User.subjects = relationship("Subject", back_populates=None)

__all__ = ["User", "Announcement", "Document", "School", "Subject"]
