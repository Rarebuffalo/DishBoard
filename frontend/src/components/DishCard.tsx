import React from 'react';

export interface Dish {
  dishId: number;
  dishName: string;
  imageUrl: string;
  isPublished: boolean;
}

interface DishCardProps {
  dish: Dish;
  onToggle: (id: number) => Promise<void>;
  isToggling: boolean;
}

export const DishCard: React.FC<DishCardProps> = ({ dish, onToggle, isToggling }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      {/* Dish Image */}
      <div className="h-48 w-full overflow-hidden bg-slate-100 relative">
        <img
          src={dish.imageUrl}
          alt={dish.dishName}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
        {/* Status Badge */}
        <span
          className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm border ${
            dish.isPublished
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          {dish.isPublished ? 'Published' : 'Unpublished'}
        </span>
      </div>

      {/* Dish Details */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-1">
          {dish.dishName}
        </h3>

        {/* Action Button */}
        <button
          onClick={() => onToggle(dish.dishId)}
          disabled={isToggling}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            dish.isPublished
              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 focus:ring-amber-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm shadow-indigo-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isToggling ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating...
            </span>
          ) : dish.isPublished ? (
            'Unpublish'
          ) : (
            'Publish'
          )}
        </button>
      </div>
    </div>
  );
};
