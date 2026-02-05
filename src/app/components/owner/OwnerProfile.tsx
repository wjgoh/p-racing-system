import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getStoredUser, setStoredUser } from "../api/session";
import {
  apiGetOwnerProfile,
  apiUpdateOwnerProfile,
  type OwnerProfile as OwnerProfileRecord,
} from "../api/ownerProfile";

interface OwnerProfileProps {
  onBack: () => void;
}

export function OwnerProfile({ onBack }: OwnerProfileProps) {
  const [profile, setProfile] = useState<OwnerProfileRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    oldPassword: "",
    confirmOldPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.owner_id) {
      setError("Owner profile not found. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);
    apiGetOwnerProfile(user.owner_id)
      .then((data) => {
        setProfile(data);
        setForm((prev) => ({
          ...prev,
          name: data.name ?? "",
          phone: data.phone ?? "",
        }));
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    const name = form.name.trim();
    const phone = form.phone.trim();
    const oldPassword = form.oldPassword.trim();
    const confirmOldPassword = form.confirmOldPassword.trim();
    const newPassword = form.newPassword.trim();

    if (!name) {
      setError("Username is required.");
      return;
    }

    if (oldPassword || confirmOldPassword || newPassword) {
      if (!oldPassword || !confirmOldPassword || !newPassword) {
        setError("Fill out old password, confirm old password, and new password.");
        return;
      }
      if (oldPassword !== confirmOldPassword) {
        setError("Old passwords do not match.");
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiUpdateOwnerProfile({
        ownerId: profile.owner_id,
        name,
        phone: phone || null,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setProfile(updated);
      setForm((prev) => ({
        ...prev,
        name: updated.name ?? "",
        phone: updated.phone ?? "",
        oldPassword: "",
        confirmOldPassword: "",
        newPassword: "",
      }));
      const current = getStoredUser();
      if (current) {
        setStoredUser({
          ...current,
          name: updated.name,
          email: updated.email,
        });
      }
      setSuccess("Profile updated.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Profile</h2>
          <p className="text-slate-600 mt-1">
            View your account details and update your profile.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <Card className="p-6 space-y-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading profile...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profileUsername">Username</Label>
                <Input
                  id="profileUsername"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profile?.email ?? ""}
                  readOnly
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Phone</Label>
                <Input
                  id="profilePhone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g., 0912-345-678"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Change Password
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profileOldPassword">Old Password</Label>
                  <Input
                    id="profileOldPassword"
                    type="password"
                    value={form.oldPassword}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        oldPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter old password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileConfirmOldPassword">
                    Confirm Old Password
                  </Label>
                  <Input
                    id="profileConfirmOldPassword"
                    type="password"
                    value={form.confirmOldPassword}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        confirmOldPassword: e.target.value,
                      }))
                    }
                    placeholder="Re-enter old password"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="profileNewPassword">New Password</Label>
                  <Input
                    id="profileNewPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Leave password fields blank if you do not want to change it.
              </p>
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading || !form.name.trim()}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
