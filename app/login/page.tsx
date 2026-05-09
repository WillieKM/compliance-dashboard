"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("LOGIN ERROR:", error);
      alert(error.message);
      return;
    }

    setTimeout(() => {
      window.location.assign("/dashboard");
    }, 300);
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      <form onSubmit={handleLogin} className="space-y-5">
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded-lg p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium"
        >
          Login
        </button>
      </form>

      <p className="mt-4 text-sm">
        No account?{" "}
        <a href="/signup" className="text-blue-600 underline">
          Sign up
        </a>
      </p>
    </div>
  );
}