// const API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = "http://localhost:3000";

export async function getUserPreferences(userId) {
  const res = await fetch(`${API_BASE}/user-preferences/${userId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch preferences");
  }

  return res.json();
}

export async function saveUserPreferences(payload) {
  const res = await fetch(`${API_BASE}/user-preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save preferences");
  }

  return res.json();
}
