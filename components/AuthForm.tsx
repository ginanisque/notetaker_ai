"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) throw signUpError;

        setMessage("Account created. If email confirmation is enabled, check your inbox before logging in.");
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

        if (loginError) throw loginError;

        await fetch("/api/auth/session", { cache: "no-store" });
        router.push("/meetings");
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md bg-white p-6">
      {isSignup ? (
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-semibold text-ink">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-md border border-line px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoComplete="name"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-md border border-line px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className="w-full rounded-md border border-line px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Please wait..." : isSignup ? "Create account" : "Login"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent hover:underline">
          {isSignup ? "Login" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
