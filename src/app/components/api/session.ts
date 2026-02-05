export type SessionUser = {
  user_id: number;
  owner_id?: number | null;
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

export function setStoredUser(user: SessionUser) {
  const raw = JSON.stringify(user);
  if (localStorage.getItem("user")) {
    localStorage.setItem("user", raw);
    return;
  }
  if (sessionStorage.getItem("user")) {
    sessionStorage.setItem("user", raw);
    return;
  }
  localStorage.setItem("user", raw);
}
