import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Mail, Phone, MapPin, Shield, Edit2, Save, X } from "lucide-react";
import { apiGetUserProfile, apiUpdateUserProfile } from "../api/owner";
import { getStoredUser } from "../api/session";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  role: string;
  joinDate: string;
  avatar: string;
  verified: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    id: "OWN001",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "California",
    zipCode: "90001",
    role: "Vehicle Owner",
    joinDate: "January 2024",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    verified: true,
  });

  const [editedProfile, setEditedProfile] = useState(profile);

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = getStoredUser();

      if (!user) {
        setError("Please log in again");
        return;
      }

      const userData = await apiGetUserProfile(user.user_id);

      if (userData) {
        const updatedProfile: UserProfile = {
          id: userData.owner_id ? `OWN${userData.owner_id}` : "OWN001",
          name: userData.name || profile.name,
          email: userData.email || profile.email,
          phone: userData.phone || profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
          role: userData.role || "Vehicle Owner",
          joinDate: profile.joinDate,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name || "User"}`,
          verified: true,
        };
        setProfile(updatedProfile);
        setEditedProfile(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const user = getStoredUser();

      if (!user) {
        setError("Please log in again");
        return;
      }

      await apiUpdateUserProfile(user.user_id, {
        name: editedProfile.name,
        email: editedProfile.email,
        phone: editedProfile.phone,
      });

      setProfile(editedProfile);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            View and manage your account information
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        )}

        {!loading && (
          <div className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback>
                      {profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {profile.role}
                      </Badge>
                      {profile.verified && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() =>
                    isEditing ? handleCancel() : setIsEditing(true)
                  }
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs text-muted-foreground"
                    >
                      Full Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editedProfile.name}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            name: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{profile.name}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs text-muted-foreground"
                    >
                      Email Address
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={editedProfile.email}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            email: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-xs text-muted-foreground"
                    >
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editedProfile.phone}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            phone: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <p className="font-medium">{profile.phone}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="zipCode"
                      className="text-xs text-muted-foreground"
                    >
                      Zip Code
                    </Label>
                    {isEditing ? (
                      <Input
                        id="zipCode"
                        value={editedProfile.zipCode}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            zipCode: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="font-medium">{profile.zipCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="address"
                      className="text-xs text-muted-foreground"
                    >
                      Street Address
                    </Label>
                    {isEditing ? (
                      <Input
                        id="address"
                        value={editedProfile.address}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            address: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <p className="font-medium">{profile.address}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="city"
                      className="text-xs text-muted-foreground"
                    >
                      City
                    </Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        value={editedProfile.city}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            city: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="font-medium">{profile.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="state"
                      className="text-xs text-muted-foreground"
                    >
                      State
                    </Label>
                    {isEditing ? (
                      <Input
                        id="state"
                        value={editedProfile.state}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            state: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="font-medium">{profile.state}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Account ID
                    </Label>
                    <p className="font-mono text-sm font-medium">
                      {profile.id}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Member Since
                    </Label>
                    <p className="font-medium">{profile.joinDate}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Account Type
                    </Label>
                    <p className="font-medium">{profile.role}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Security Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Security</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                  >
                    <Shield className="h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dialog Footer */}
        {isEditing && (
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
