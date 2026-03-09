"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        // Force hard refresh to ensure middleware picks up the new cookie
        window.location.href = "/";
      } else {
        setError(data.error || "סיסמה שגויה");
      }
    } catch (err) {
      setError("שגיאת תקשורת, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 relative overflow-hidden flex items-center justify-center p-4 font-sans" dir="rtl">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] sm:right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 pointer-events-none bg-indigo-900" />
      <div className="absolute bottom-[-10%] sm:left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-30 pointer-events-none bg-fuchsia-900/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0f111a]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-indigo-500/10 rounded-3xl p-8 sm:p-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Sue-Chef</h1>
            <p className="text-gray-400 font-medium">הזן סיסמת גישה למערכת ניהול הלידים</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה סודית..."
                className="w-full bg-[#151822] border border-gray-800 text-white placeholder-gray-500 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-sans text-lg tracking-widest text-center"
                autoFocus
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl p-4 text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl px-6 py-4 font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  כניסה <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-gray-600 text-sm mt-8 font-medium space-x-2 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" /> <span>מערכת מאובטחת - גישה למורשים בלבד</span>
        </p>
      </div>
    </div>
  );
}
