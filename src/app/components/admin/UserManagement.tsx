import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { UserPlus, Pencil, Trash2, Search } from "lucide-react";
import {
  apiCreateAdminUser,
  apiDeactivateAdminUser,
  apiListAdminUsers,
  apiUpdateAdminUser,
  type AdminUserRecord,
} from "../api/admin";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "workshop" | "mechanic" | "vehicle owner";
  status: "active" | "inactive";
  createdAt: string | null;
}

const mapRoleFromDb = (role: AdminUserRecord["role"]): User["role"] => {
  switch (String(role ?? "").toUpperCase()) {
    case "ADMIN":
      return "admin";
    case "WORKSHOP":
      return "workshop";
    case "MECHANIC":
      return "mechanic";
    case "OWNER":
    default:
      return "vehicle owner";
  }
};

const mapRoleToDb = (
  role: User["role"]
): "ADMIN" | "WORKSHOP" | "MECHANIC" | "OWNER" => {
  switch (role) {
    case "admin":
      return "ADMIN";
    case "workshop":
      return "WORKSHOP";
    case "mechanic":
      return "MECHANIC";
    default:
      return "OWNER";
  }
};

const formatDateValue = (value: AdminUserRecord["created_at"]): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
};

const mapUserRecord = (record: AdminUserRecord): User => ({
  id: Number(record.user_id),
  name: record.name ?? "",
  email: record.email ?? "",
  role: mapRoleFromDb(record.role),
  status: record.status === "inactive" ? "inactive" : "active",
  createdAt: formatDateValue(record.created_at),
});

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "vehicle owner" as User["role"],
    status: "active" as User["status"],
    password: "",
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListAdminUsers();
      setUsers(data.map(mapUserRecord));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    setError(null);
    setFormData({
      name: "",
      email: "",
      role: "vehicle owner",
      status: "active",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setError(null);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (deletingId) return;
    const confirmed = confirm(
      "Are you sure you want to deactivate this user? They will be unable to log in."
    );
    if (!confirmed) return;
    setError(null);
    setDeletingId(id);
    try {
      await apiDeactivateAdminUser(id);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, status: "inactive" } : user
        )
      );
    } catch (err: any) {
      setError(err?.message ?? "Failed to deactivate user");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setError("Password is required for new users.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updated = await apiUpdateAdminUser({
          userId: editingUser.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: mapRoleToDb(formData.role),
          status: formData.status,
          password: formData.password.trim() || undefined,
        });
        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingUser.id ? mapUserRecord(updated) : user
          )
        );
      } else {
        const created = await apiCreateAdminUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: mapRoleToDb(formData.role),
          status: formData.status,
          password: formData.password,
        });
        setUsers((prev) => [mapUserRecord(created), ...prev]);
      }

      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "workshop":
        return "default";
      case "mechanic":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users and their roles</p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Filters and Actions */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Label htmlFor="role-filter">Filter by Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger id="role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="mechanic">Mechanic</SelectItem>
                <SelectItem value="vehicle owner">Vehicle Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAddUser}
            className="gap-2 w-full md:w-auto"
            disabled={saving}
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">Loading users...</p>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{user.name}</div>
                        <div className="md:hidden text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={
                          user.status === "active" ? "default" : "secondary"
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.createdAt ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          disabled={saving}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={saving || deletingId === user.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.role === "admin").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Workshops</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.role === "workshop").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Mechanics</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.role === "mechanic").length}
          </p>
        </Card>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information and role."
                : "Create a new user account with a specific role."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">
                Password {editingUser ? "(leave blank to keep current)" : ""}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editingUser ? "********" : "Create a password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                minLength={8}
              />
              {!editingUser && (
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as User["role"] })
                }
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="mechanic">Mechanic</SelectItem>
                  <SelectItem value="vehicle owner">Vehicle Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as User["status"] })
                }
              >
                <SelectTrigger id="user-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingUser
                  ? "Update User"
                  : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
