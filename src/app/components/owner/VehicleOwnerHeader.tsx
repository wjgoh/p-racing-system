import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  LogOut,
  Bell,
  User,
  CalendarClock,
  Shield,
  Wrench,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getStoredUser } from "../api/session";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  apiListOwnerNotifications,
  apiMarkOwnerNotificationsRead,
  type OwnerNotificationEvent,
  type OwnerServiceReminder,
} from "../api/ownerNotifications";

interface VehicleOwnerHeaderProps {
  onLogout: () => void;
  onMenuToggle: () => void;
  onProfileClick: () => void;
}

export function VehicleOwnerHeader({
  onLogout,
  onMenuToggle,
  onProfileClick,
}: VehicleOwnerHeaderProps) {
  const user = getStoredUser();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<OwnerNotificationEvent[]>([]);
  const [reminders, setReminders] = useState<OwnerServiceReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadEventCount = useMemo(
    () => events.filter((event) => !event.read_at).length,
    [events]
  );
  const badgeCount = unreadEventCount + reminders.length;

  const formatTimestamp = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  const getEventIcon = (event: OwnerNotificationEvent) => {
    const source = String(event.source ?? "").toLowerCase();
    if (source === "admin") return <Shield className="h-4 w-4 text-slate-700" />;
    if (source === "workshop") return <Wrench className="h-4 w-4 text-slate-700" />;
    return <Bell className="h-4 w-4 text-slate-700" />;
  };

  const loadNotifications = async () => {
    if (!user?.owner_id) {
      setError("Owner profile not found. Please log in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiListOwnerNotifications(user.owner_id);
      setEvents(data.events);
      setReminders(data.reminders);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.owner_id) return;
    void loadNotifications();
  }, [user?.owner_id]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, user?.owner_id]);

  const handleMarkAllRead = async () => {
    if (!user?.owner_id) return;
    if (unreadEventCount === 0) return;
    setError(null);
    try {
      await apiMarkOwnerNotificationsRead({ ownerId: user.owner_id });
      const now = new Date().toISOString();
      setEvents((prev) =>
        prev.map((event) => (event.read_at ? event : { ...event, read_at: now }))
      );
    } catch (err: any) {
      setError(err?.message ?? "Failed to mark notifications read");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">
              Welcome back, {user?.name ?? "Owner"}
            </h1>
            <p className="text-sm text-slate-500 hidden md:block">
              Manage your vehicles and service requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {badgeCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                    {badgeCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] p-0">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">
                    {badgeCount} item{badgeCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadEventCount === 0}
                >
                  Mark all read
                </Button>
              </div>

              <div className="max-h-[24rem] overflow-auto px-4 py-3 space-y-4">
                {loading && (
                  <p className="text-sm text-slate-500">Loading...</p>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}

                {!loading && !error && reminders.length === 0 && events.length === 0 && (
                  <p className="text-sm text-slate-500">
                    You have no notifications right now.
                  </p>
                )}

                {reminders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Reminders
                    </p>
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mt-0.5">
                          <CalendarClock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">
                            {reminder.title}
                          </p>
                          <p className="text-xs text-slate-600">{reminder.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {events.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Updates
                    </p>
                    {events.map((event) => (
                      <div
                        key={event.notification_id}
                        className={`flex gap-3 rounded-lg border p-3 ${
                          event.read_at
                            ? "border-slate-200 bg-white"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <div className="mt-0.5">{getEventIcon(event)}</div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {event.title}
                            </p>
                            {!event.read_at && (
                              <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{event.message}</p>
                          {formatTimestamp(event.created_at) && (
                            <p className="text-[11px] text-slate-400">
                              {formatTimestamp(event.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={onProfileClick}>
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
