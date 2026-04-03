const API_BASE = import.meta.env.VITE_API_BASE_URL;

let userPromise = null; // 🔥 global singleton

export function getOrCreateUser() {
  if (userPromise) return userPromise;

  userPromise = (async () => {
    let userId = localStorage.getItem("user_id");

    if (userId) return userId;

    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error("Failed to create user");
    }

    const data = await res.json();

    localStorage.setItem("user_id", data.user_id);

    return data.user_id;
  })();

  return userPromise;
}
