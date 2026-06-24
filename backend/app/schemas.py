from pydantic import BaseModel, Field, ConfigDict

class DishOut(BaseModel):
    dish_id: int = Field(..., alias="dishId")
    dish_name: str = Field(..., alias="dishName")
    image_url: str = Field(..., alias="imageUrl")
    is_published: bool = Field(..., alias="isPublished")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
