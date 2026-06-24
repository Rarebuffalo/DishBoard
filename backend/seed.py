from sqlalchemy import text
from app.database import engine, SessionLocal, Base
from app.models import Dish

# Mock seed data with high-quality images
SEED_DISHES = [
    {
        "dish_name": "Margherita Pizza",
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop",
        "is_published": True,
    },
    {
        "dish_name": "Double Cheeseburger",
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
        "is_published": False,
    },
    {
        "dish_name": "Premium Sushi Platter",
        "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop",
        "is_published": True,
    },
    {
        "dish_name": "Fettuccine Alfredo",
        "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop",
        "is_published": False,
    },
    {
        "dish_name": "Mexican Birria Tacos",
        "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=600&auto=format&fit=crop",
        "is_published": True,
    },
    {
        "dish_name": "Tonkotsu Ramen",
        "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=600&auto=format&fit=crop",
        "is_published": False,
    },
]

TRIGGER_SQL = """
-- Recreate trigger function
CREATE OR REPLACE FUNCTION notify_dish_update()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'dish_updates',
    row_to_json(NEW)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS dish_update_trigger ON dishes;

-- Create trigger to execute trigger function after changes
CREATE TRIGGER dish_update_trigger
AFTER UPDATE OR INSERT ON dishes
FOR EACH ROW
EXECUTE FUNCTION notify_dish_update();
"""

def seed_database():
    print("Connecting to database and creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Setup triggers
        print("Setting up PostgreSQL trigger...")
        db.execute(text(TRIGGER_SQL))
        db.commit()
        
        # 2. Clear existing dishes (prevents duplicates)
        print("Cleaning existing dishes...")
        db.query(Dish).delete()
        db.commit()
        
        # 3. Add seed data
        print("Inserting seed dishes...")
        for dish_data in SEED_DISHES:
            dish = Dish(**dish_data)
            db.add(dish)
        db.commit()
        print("Database successfully seeded!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
