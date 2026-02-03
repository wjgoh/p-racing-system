export type User = {
  user_id: number;
  owner_id?: number | null;
  name: string;
  email: string;
  role: "ADMIN" | "MECHANIC" | "ADVISOR" | "WORKSHOP" | "OWNER" | string;
  workshop_id?: number | null;
};

export type Workshop = {
  workshop_id: number;
  name: string;
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
  workshopId?: number | null;
  workshop?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
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
      workshopId: payload.workshopId ?? null,
      workshop: payload.workshop ?? null,
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

export async function apiListWorkshops(): Promise<Workshop[]> {
  const res = await fetch("http://127.0.0.1:4000/api/workshops");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load workshops");
  return (data?.workshops ?? []) as Workshop[];
}
