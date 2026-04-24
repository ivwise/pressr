import { useState, useEffect } from "react";
import { X, Camera, Plus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface PostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: () => void;
}

interface Exercise {
  id: number;
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

interface Meal {
  id: number;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

export function PostSheet({ isOpen, onClose, onPost }: PostSheetProps) {
  const [activeTab, setActiveTab] = useState<"workout" | "nutrition" | "journal">("workout");
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: 1, name: "", sets: "", reps: "", weight: "" }
  ]);

  const [nutritionMode, setNutritionMode] = useState<"manual" | "meals">("manual");
  const [manualMacros, setManualMacros] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: ""
  });
  const [meals, setMeals] = useState<Meal[]>([
    { id: 1, name: "", calories: "", protein: "", carbs: "", fats: "" }
  ]);

  const [journal, setJournal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  // Load existing draft when sheet opens
  useEffect(() => {
    if (isOpen) {
      loadDraft();
    }
  }, [isOpen]);

  const loadDraft = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: draft } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('is_draft', true)
      .single();

    if (draft) {
      setHasDraft(true);
      if (draft.workout_data) {
        setExercises(draft.workout_data.exercises || [{ id: 1, name: "", sets: "", reps: "", weight: "" }]);
      }
      if (draft.nutrition_data) {
        setNutritionMode(draft.nutrition_data.mode);
        if (draft.nutrition_data.mode === "manual") {
          setManualMacros(draft.nutrition_data.manual);
        } else {
          setMeals(draft.nutrition_data.meals || [{ id: 1, name: "", calories: "", protein: "", carbs: "", fats: "" }]);
        }
      }
      if (draft.journal) {
        setJournal(draft.journal);
      }
    }
  };

  if (!isOpen) return null;

  const handleSaveDraft = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const workoutData = exercises.some(e => e.name) ? {
        exercises: exercises.filter(e => e.name)
      } : null;

      const nutritionData = nutritionMode === "manual"
        ? (manualMacros.calories ? { mode: "manual", manual: manualMacros } : null)
        : (meals.some(m => m.name) ? { mode: "meals", meals: meals.filter(m => m.name) } : null);

      const today = new Date().toISOString().split('T')[0];

      // Save as draft
      await supabase
        .from('daily_logs')
        .upsert({
          user_id: user.id,
          date: today,
          workout_data: workoutData,
          nutrition_data: nutritionData,
          journal: journal.trim() || null,
          is_draft: true
        }, {
          onConflict: 'user_id,date'
        });

      setHasDraft(true);
      setLoading(false);
      onClose();
    } catch (err) {
      console.error("Save draft error:", err);
      setLoading(false);
    }
  };

  const handlePost = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to post");
        setLoading(false);
        return;
      }

      // Prepare workout data
      const workoutData = exercises.some(e => e.name) ? {
        exercises: exercises.filter(e => e.name)
      } : null;

      // Prepare nutrition data
      const nutritionData = nutritionMode === "manual"
        ? (manualMacros.calories ? { mode: "manual", manual: manualMacros } : null)
        : (meals.some(m => m.name) ? { mode: "meals", meals: meals.filter(m => m.name) } : null);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Save to database and publish (not a draft)
      const { data: newLog, error: insertError } = await supabase
        .from('daily_logs')
        .upsert({
          user_id: user.id,
          date: today,
          workout_data: workoutData,
          nutrition_data: nutritionData,
          journal: journal.trim() || null,
          is_draft: false
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      // Notify group members
      const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (myGroups && myGroups.length > 0) {
        const groupIds = myGroups.map(g => g.group_id);

        // Get all members from these groups (except current user)
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', user.id);

        if (groupMembers && groupMembers.length > 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

          const notifications = groupMembers.map(member => ({
            user_id: member.user_id,
            type: 'group_post',
            content: `${userData?.name} just posted their daily log`,
            related_user_id: user.id,
            related_log_id: newLog?.id
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      // Reset form
      setExercises([{ id: 1, name: "", sets: "", reps: "", weight: "" }]);
      setManualMacros({ calories: "", protein: "", carbs: "", fats: "" });
      setMeals([{ id: 1, name: "", calories: "", protein: "", carbs: "", fats: "" }]);
      setJournal("");
      setActiveTab("workout");
      setLoading(false);

      onPost();
    } catch (err: any) {
      console.error("Post error:", err);
      setError(err.message || "Failed to save log");
      setLoading(false);
    }
  };

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now(), name: "", sets: "", reps: "", weight: "" }]);
  };

  const removeExercise = (id: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter(ex => ex.id !== id));
    }
  };

  const updateExercise = (id: number, field: keyof Exercise, value: string) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const addMeal = () => {
    setMeals([...meals, { id: Date.now(), name: "", calories: "", protein: "", carbs: "", fats: "" }]);
  };

  const removeMeal = (id: number) => {
    if (meals.length > 1) {
      setMeals(meals.filter(m => m.id !== id));
    }
  };

  const updateMeal = (id: number, field: keyof Meal, value: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] w-full max-w-md mx-auto rounded-t-3xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-medium">Log Your Day</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-2 p-4 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "workout" ? "bg-[#FF5C00] text-white" : "bg-[#2A2A2A] text-gray-300"
            }`}
          >
            Workout
          </button>
          <button
            onClick={() => setActiveTab("nutrition")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "nutrition" ? "bg-[#FF5C00] text-white" : "bg-[#2A2A2A] text-gray-300"
            }`}
          >
            Nutrition
          </button>
          <button
            onClick={() => setActiveTab("journal")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "journal" ? "bg-[#FF5C00] text-white" : "bg-[#2A2A2A] text-gray-300"
            }`}
          >
            Journal
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "workout" && (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="bg-[#0F0F0F] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500">Exercise {index + 1}</span>
                    {exercises.length > 1 && (
                      <button onClick={() => removeExercise(exercise.id)} className="text-red-500">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={exercise.name}
                    onChange={(e) => updateExercise(exercise.id, "name", e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 mb-3 focus:outline-none focus:border-[#FF5C00]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Sets"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(exercise.id, "sets", e.target.value)}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                    <input
                      type="text"
                      placeholder="Reps"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(exercise.id, "reps", e.target.value)}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                    <input
                      type="text"
                      placeholder="Weight"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(exercise.id, "weight", e.target.value)}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addExercise}
                className="w-full py-3 border-2 border-dashed border-[#2A2A2A] rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Exercise
              </button>
            </div>
          )}

          {activeTab === "nutrition" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setNutritionMode("manual")}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    nutritionMode === "manual" ? "bg-[#FF5C00]/20 text-[#FF5C00]" : "bg-[#2A2A2A] text-gray-300"
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setNutritionMode("meals")}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    nutritionMode === "meals" ? "bg-[#FF5C00]/20 text-[#FF5C00]" : "bg-[#2A2A2A] text-gray-300"
                  }`}
                >
                  By Meal
                </button>
              </div>

              {nutritionMode === "manual" ? (
                <div className="bg-[#0F0F0F] rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Calories"
                    value={manualMacros.calories}
                    onChange={(e) => setManualMacros({...manualMacros, calories: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Protein (g)"
                      value={manualMacros.protein}
                      onChange={(e) => setManualMacros({...manualMacros, protein: e.target.value})}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                    <input
                      type="text"
                      placeholder="Carbs (g)"
                      value={manualMacros.carbs}
                      onChange={(e) => setManualMacros({...manualMacros, carbs: e.target.value})}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                    <input
                      type="text"
                      placeholder="Fats (g)"
                      value={manualMacros.fats}
                      onChange={(e) => setManualMacros({...manualMacros, fats: e.target.value})}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal, index) => (
                    <div key={meal.id} className="bg-[#0F0F0F] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider text-gray-500">Meal {index + 1}</span>
                        {meals.length > 1 && (
                          <button onClick={() => removeMeal(meal.id)} className="text-red-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Meal name"
                        value={meal.name}
                        onChange={(e) => updateMeal(meal.id, "name", e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 mb-3 focus:outline-none focus:border-[#FF5C00]"
                      />
                      <input
                        type="text"
                        placeholder="Calories"
                        value={meal.calories}
                        onChange={(e) => updateMeal(meal.id, "calories", e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 mb-2 focus:outline-none focus:border-[#FF5C00]"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Protein"
                          value={meal.protein}
                          onChange={(e) => updateMeal(meal.id, "protein", e.target.value)}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                        />
                        <input
                          type="text"
                          placeholder="Carbs"
                          value={meal.carbs}
                          onChange={(e) => updateMeal(meal.id, "carbs", e.target.value)}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                        />
                        <input
                          type="text"
                          placeholder="Fats"
                          value={meal.fats}
                          onChange={(e) => updateMeal(meal.id, "fats", e.target.value)}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addMeal}
                    className="w-full py-3 border-2 border-dashed border-[#2A2A2A] rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Meal
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "journal" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
                  How did today feel?
                </label>
                <textarea
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="Energy levels, sleep quality, mood, notes..."
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 resize-none h-40 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>
              <button className="flex items-center gap-2 text-gray-400 text-sm">
                <Camera size={20} />
                <span>Add photo (optional)</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#2A2A2A]">
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className={`flex-1 py-4 rounded-xl font-medium transition-all duration-200 ${
                loading
                  ? "bg-[#2A2A2A] text-gray-600"
                  : "bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] border border-[#3A3A3A]"
              }`}
            >
              {loading ? "Saving..." : hasDraft ? "Update Draft" : "Save Draft"}
            </button>
            <button
              onClick={handlePost}
              disabled={loading}
              className={`flex-1 py-4 rounded-xl font-semibold transition-all duration-200 ${
                loading
                  ? "bg-[#2A2A2A] text-gray-600"
                  : "bg-gradient-to-r from-[#FF5C00] to-[#FF7A33] text-white shadow-lg shadow-[#FF5C00]/30 hover:shadow-xl hover:shadow-[#FF5C00]/40"
              }`}
            >
              {loading ? "Posting..." : "Post Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
