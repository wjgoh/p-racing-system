export type SessionUser = {
  user_id: number;
  name: string;
  email: string;
  role: string;
  workshop_id?: number | null;
};

export function getStoredUser(): SessionUser | null {
  const raw =
    localStorage.getItem("user") ?? sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
