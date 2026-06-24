from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .database import get_db
from .models import Dish
from .schemas import DishOut

router = APIRouter(prefix="/api/dishes", tags=["dishes"])

@router.get("", response_model=List[DishOut])
def get_dishes(db: Session = Depends(get_db)):
    """Fetch all dishes from the database."""
    dishes = db.query(Dish).order_by(Dish.dish_id.asc()).all()
    return dishes

@router.patch("/{dish_id}/toggle", response_model=DishOut)
def toggle_dish_publish(dish_id: int, db: Session = Depends(get_db)):
    """Toggle the published status of a specific dish."""
    dish = db.query(Dish).filter(Dish.dish_id == dish_id).first()
    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Dish with id {dish_id} not found"
        )
    
    # Toggle and commit
    dish.is_published = not dish.is_published
    db.commit()
    db.refresh(dish)
    return dish
