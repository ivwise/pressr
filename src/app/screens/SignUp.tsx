import { useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface SignUpProps {
  onComplete: () => void;
}

export function SignUp({ onComplete }: SignUpProps) {
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim(),
            bio: bio.trim()
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({ name: name.trim(), bio: bio.trim() })
          .eq('id', data.user.id);

        if (updateError) {
          console.error("Profile update error:", updateError);
        }

        // Auth state change will handle navigation automatically
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // Auth state change will handle navigation automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#0F0F0F] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#FF5C00]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#FF5C00]/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-8xl mb-3 tracking-wider bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            PRESSR
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-6 font-medium">
            Fitness Accountability
          </p>
          <p className="text-gray-400 text-sm">
            {mode === "signup" ? "Create your profile to get started" : "Welcome back, sign in to continue"}
          </p>
        </div>

        <div className="flex gap-3 mb-8 p-1 bg-[#1A1A1A]/50 rounded-2xl backdrop-blur-sm">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-medium ${
              mode === "login"
                ? "bg-gradient-to-r from-[#FF5C00] to-[#FF7A33] text-white shadow-lg shadow-[#FF5C00]/20"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-medium ${
              mode === "signup"
                ? "bg-gradient-to-r from-[#FF5C00] to-[#FF7A33] text-white shadow-lg shadow-[#FF5C00]/20"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={mode === "signup" ? handleSignUp : handleLogin} className="space-y-6">
          {mode === "signup" && (
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#1A1A1A] flex items-center justify-center text-4xl">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00] focus:bg-[#1A1A1A] transition-all duration-200"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00] focus:bg-[#1A1A1A] transition-all duration-200"
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block font-medium">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00] focus:bg-[#1A1A1A] transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block font-medium">
                  Bio (Optional)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fitness enthusiast • Runner • Lifter"
                  className="w-full bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00] focus:bg-[#1A1A1A] transition-all duration-200"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              loading
                ? "bg-[#2A2A2A] text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#FF5C00] to-[#FF7A33] text-white shadow-lg shadow-[#FF5C00]/30 hover:shadow-xl hover:shadow-[#FF5C00]/40 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {loading ? "Loading..." : mode === "signup" ? "Get Started" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {mode === "signup"
              ? "Join a community that holds each other accountable"
              : "Don't have an account? Tap Sign Up above"}
          </p>
        </div>
      </div>
    </div>
  );
}
