import { apiFetch } from "./apiClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function getUserPreferences(userId) {
  const res = await apiFetch(`/user-preferences/${userId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch preferences");
  }

  return res.json();
}

export async function saveUserPreferences(payload) {
  // ✅ STEP 1: ensure user exists in DB
  await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: payload.user_id }),
  });

  // ✅ STEP 2: save preferences
  const res = await apiFetch(`/user-preferences`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save preferences");
  }

  return res.json();
}
