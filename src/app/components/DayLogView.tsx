import { Dumbbell, Apple, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

interface Meal {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

interface DayLogData {
  workout?: {
    exercises: Exercise[];
  };
  nutrition?: {
    mode: "manual" | "meals";
    manual?: {
      calories: string;
      protein: string;
      carbs: string;
      fats: string;
    };
    meals?: Meal[];
  };
  journal?: string;
}

interface DayLogViewProps {
  data: DayLogData;
  compact?: boolean;
}

export function DayLogView({ data, compact = false }: DayLogViewProps) {
  const hasWorkout = data.workout && data.workout.exercises.some(e => e.name);
  const hasNutrition = data.nutrition && (
    (data.nutrition.mode === "manual" && data.nutrition.manual?.calories) ||
    (data.nutrition.mode === "meals" && data.nutrition.meals?.some(m => m.name))
  );
  const hasJournal = data.journal && data.journal.trim();

  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Build slides array based on what data exists
  const slides = [];
  if (hasJournal) slides.push('journal');
  if (hasWorkout) slides.push('workout');
  if (hasNutrition) slides.push('nutrition');

  const totalSlides = slides.length;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold && currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else if (diff < -threshold && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-3 text-xs text-gray-400">
        {hasWorkout && (
          <div className="flex items-center gap-1">
            <Dumbbell size={14} />
            <span>Workout</span>
          </div>
        )}
        {hasNutrition && (
          <div className="flex items-center gap-1">
            <Apple size={14} />
            <span>Nutrition</span>
          </div>
        )}
        {hasJournal && (
          <div className="flex items-center gap-1">
            <BookOpen size={14} />
            <span>Journal</span>
          </div>
        )}
      </div>
    );
  }

  if (totalSlides === 0) {
    return <div className="text-gray-500 text-sm text-center py-4">No log data</div>;
  }

  const currentSlideType = slides[currentSlide];

  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slideType, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {slideType === 'journal' && hasJournal && (
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl p-6 min-h-[200px] flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF5C00]/10 flex items-center justify-center">
                      <BookOpen size={20} className="text-[#FF5C00]" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">Journal Entry</h3>
                  </div>
                  <p className="text-base text-gray-200 leading-relaxed flex-1">{data.journal}</p>
                </div>
              )}

              {slideType === 'workout' && hasWorkout && (
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl p-6 min-h-[200px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF5C00]/10 flex items-center justify-center">
                      <Dumbbell size={20} className="text-[#FF5C00]" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">Workout</h3>
                  </div>
                  <div className="space-y-3">
                    {data.workout!.exercises.filter(e => e.name).map((exercise, idx) => (
                      <div key={idx} className="bg-[#0F0F0F]/50 rounded-xl p-3 border border-[#2A2A2A]">
                        <div className="font-medium text-white mb-1">{exercise.name}</div>
                        <div className="text-sm text-gray-400">
                          {exercise.sets && `${exercise.sets} sets`}
                          {exercise.sets && exercise.reps && " × "}
                          {exercise.reps && `${exercise.reps} reps`}
                          {exercise.weight && ` @ ${exercise.weight}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slideType === 'nutrition' && hasNutrition && (
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl p-6 min-h-[200px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF5C00]/10 flex items-center justify-center">
                      <Apple size={20} className="text-[#FF5C00]" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">Nutrition</h3>
                  </div>

                  {data.nutrition!.mode === "manual" && data.nutrition!.manual && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#0F0F0F]/50 rounded-xl p-4 border border-[#2A2A2A] text-center">
                        <div className="text-2xl font-bold text-white mb-1">{data.nutrition!.manual.calories}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Calories</div>
                      </div>
                      <div className="bg-[#0F0F0F]/50 rounded-xl p-4 border border-[#2A2A2A] text-center">
                        <div className="text-2xl font-bold text-white mb-1">{data.nutrition!.manual.protein}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Protein</div>
                      </div>
                      <div className="bg-[#0F0F0F]/50 rounded-xl p-4 border border-[#2A2A2A] text-center">
                        <div className="text-2xl font-bold text-white mb-1">{data.nutrition!.manual.carbs}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Carbs</div>
                      </div>
                      <div className="bg-[#0F0F0F]/50 rounded-xl p-4 border border-[#2A2A2A] text-center">
                        <div className="text-2xl font-bold text-white mb-1">{data.nutrition!.manual.fats}g</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Fats</div>
                      </div>
                    </div>
                  )}

                  {data.nutrition!.mode === "meals" && data.nutrition!.meals && (
                    <div className="space-y-3">
                      {data.nutrition!.meals.filter(m => m.name).map((meal, idx) => (
                        <div key={idx} className="bg-[#0F0F0F]/50 rounded-xl p-3 border-l-4 border-[#FF5C00]">
                          <div className="text-sm font-medium text-white mb-1">{meal.name}</div>
                          <div className="text-xs text-gray-400">
                            {meal.calories} cal • P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fats}g
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slide indicators */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-[#FF5C00]'
                  : 'w-1.5 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
