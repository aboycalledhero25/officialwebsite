"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Music, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else if (result?.ok) {
      window.location.href = callbackUrl;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] mb-4">
            <Music className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            A Boy Called Hero
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Admin Portal</p>
        </div>

        <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#00f0ff] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Default password is <span className="text-neutral-500">changeme</span>. Update it in your environment variables.
        </p>
      </div>
    </div>
  );
}
