"use client"; // Important! This makes the component a Client Component

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ FIXED: Import from "next/navigation"

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/chat"); // Redirect logged-in users to chat
    } else {
      router.push("/login"); // Redirect non-authenticated users to login
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <h2 className="text-xl font-semibold">Redirecting...</h2>
    </div>
  );
}
