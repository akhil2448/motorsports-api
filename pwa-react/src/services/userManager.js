const API_BASE = import.meta.env.VITE_API_BASE_URL;

let userPromise = null;

export function getOrCreateUser() {
  if (userPromise) return userPromise;

  userPromise = (async () => {
    let userId = localStorage.getItem("user_id");

    // ✅ ONLY generate locally
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("user_id", userId);
    }

    return userId;
  })();

  return userPromise;
}
