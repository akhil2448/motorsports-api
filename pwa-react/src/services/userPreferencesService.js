import { apiFetch } from "./apiClient";

export async function getUserPreferences(userId) {
  const res = await apiFetch(`/user-preferences/${userId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch preferences");
  }

  return res.json();
}

export async function saveUserPreferences(payload) {
  const res = await apiFetch(`/user-preferences`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save preferences");
  }

  return res.json();
}
