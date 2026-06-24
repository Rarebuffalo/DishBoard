from sqlalchemy import Column, Integer, String, Boolean, Text
from .database import Base

class Dish(Base):
    __tablename__ = "dishes"

    dish_id = Column(Integer, primary_key=True, index=True)
    dish_name = Column(String(255), nullable=False)
    image_url = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
