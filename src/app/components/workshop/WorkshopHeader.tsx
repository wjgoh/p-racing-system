import { useEffect, useMemo, useState } from "react";
import { Menu, LogOut, Bell, Shield, Wrench, User } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getStoredUser } from "../api/session";
import {
  apiListWorkshopNotifications,
  apiMarkWorkshopNotificationsRead,
  type WorkshopNotificationEvent,
} from "../api/workshopNotifications";

interface WorkshopHeaderProps {
  onLogout: () => void;
  onMenuToggle: () => void;
}

export function WorkshopHeader({ onLogout, onMenuToggle }: WorkshopHeaderProps) {
  const user = getStoredUser();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<WorkshopNotificationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => events.filter((event) => !event.read_at).length,
    [events]
  );

  const requests = useMemo(
    () => events.filter((event) => String(event.source).toLowerCase() === "owner"),
    [events]
  );
  const mechanicUpdates = useMemo(
    () =>
      events.filter((event) => String(event.source).toLowerCase() === "mechanic"),
    [events]
  );
  const adminApprovals = useMemo(
    () => events.filter((event) => String(event.source).toLowerCase() === "admin"),
    [events]
  );
  const otherUpdates = useMemo(
    () =>
      events.filter((event) => {
        const source = String(event.source).toLowerCase();
        return source !== "owner" && source !== "mechanic" && source !== "admin";
      }),
    [events]
  );

  const formatTimestamp = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  const getEventIcon = (event: WorkshopNotificationEvent) => {
    const source = String(event.source ?? "").toLowerCase();
    if (source === "admin") return <Shield className="h-4 w-4 text-slate-700" />;
    if (source === "mechanic") return <Wrench className="h-4 w-4 text-slate-700" />;
    if (source === "owner") return <User className="h-4 w-4 text-slate-700" />;
    return <Bell className="h-4 w-4 text-slate-700" />;
  };

  const loadNotifications = async () => {
    if (!user?.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiListWorkshopNotifications(user.workshop_id);
      setEvents(data.events);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.workshop_id) return;
    void loadNotifications();
  }, [user?.workshop_id]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, user?.workshop_id]);

  const handleMarkAllRead = async () => {
    if (!user?.workshop_id) return;
    if (unreadCount === 0) return;
    setError(null);
    try {
      await apiMarkWorkshopNotificationsRead({ workshopId: user.workshop_id });
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
              Workshop Manager
            </h1>
            <p className="text-sm text-slate-500 hidden md:block">
              Manage jobs, mechanics, and invoices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] p-0">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Notifications
                  </p>
                  <p className="text-xs text-slate-500">
                    {unreadCount} unread
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </Button>
              </div>

              <div className="max-h-[24rem] overflow-auto px-4 py-3 space-y-4">
                {loading && <p className="text-sm text-slate-500">Loading...</p>}
                {error && <p className="text-sm text-red-500">{error}</p>}

                {!loading &&
                  !error &&
                  requests.length === 0 &&
                  mechanicUpdates.length === 0 &&
                  adminApprovals.length === 0 &&
                  otherUpdates.length === 0 && (
                    <p className="text-sm text-slate-500">
                      You have no notifications right now.
                    </p>
                  )}

                {requests.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      New Requests
                    </p>
                    {requests.map((event) => (
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

                {mechanicUpdates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mechanic Updates
                    </p>
                    {mechanicUpdates.map((event) => (
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

                {adminApprovals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Admin Approvals
                    </p>
                    {adminApprovals.map((event) => (
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

                {otherUpdates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Other
                    </p>
                    {otherUpdates.map((event) => (
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
          <Button variant="ghost" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
