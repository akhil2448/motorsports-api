const API_BASE = import.meta.env.VITE_API_BASE_URL;

let userPromise = null; // 🔥 global singleton

export function getOrCreateUser() {
  if (userPromise) return userPromise;

  userPromise = (async () => {
    let userId = localStorage.getItem("user_id");

    // ✅ If exists → reuse it
    if (userId) {
      await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      return userId;
    }

    // ✅ If not → create new
    userId = crypto.randomUUID();

    await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });

    localStorage.setItem("user_id", userId);

    return userId;
  })();

  return userPromise;
}
