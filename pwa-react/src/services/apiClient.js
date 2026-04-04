const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(url, options = {}) {
  const userId = localStorage.getItem("user_id");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (userId) {
    headers["x-user-id"] = userId;
  }

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
}
