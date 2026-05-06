import { apiFetch } from "./apiClient";

export async function getPushStatus() {
  const res = await apiFetch("/push/status");

  if (!res.ok) {
    throw new Error("Failed to fetch push status");
  }

  return res.json();
}
