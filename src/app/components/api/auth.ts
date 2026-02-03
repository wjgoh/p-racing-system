export type User = {
  user_id: number;
  name: string;
  email: string;
  role: "ADMIN" | "MECHANIC" | "ADVISOR" | "WORKSHOP" | "OWNER" | string;
};
export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MECHANIC" | "ADVISOR" | "WORKSHOP" | "OWNER" | string;
  vehicles?: Array<{
    plateNumber: string;
    make: string;
    model: string;
    year: string;
    color: string;
  }>;
}) {
  const res = await fetch("http://127.0.0.1:4000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      vehicles: payload.vehicles ?? [],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Register failed");
  return data; // { user_id: ... }
}

export async function apiLogin(email: string, password: string): Promise<User> {
  const res = await fetch("http://127.0.0.1:4000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Login failed");

  return data.user as User;
}
