const API_BASE = import.meta.env.VITE_API_BASE_URL;

let userPromise = null;

export function getOrCreateUser() {
  if (userPromise) return userPromise;

  userPromise = (async () => {
    let userId = localStorage.getItem("user_id");

    // existing user
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

    // 🔥 generate FIRST and save immediately
    userId = crypto.randomUUID();

    localStorage.setItem("user_id", userId);

    try {
      await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch (err) {
      console.error("User bootstrap failed:", err);

      // optional rollback:
      // localStorage.removeItem("user_id");
    }

    return userId;
  })();

  return userPromise;
}
