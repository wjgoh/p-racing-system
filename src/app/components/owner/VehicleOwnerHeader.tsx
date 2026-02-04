import { useState } from "react";
import {
  Menu,
  LogOut,
  Bell,
  User,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { UserProfileModal } from "./UserProfileModal";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "error";
  timestamp: string;
  read: boolean;
}
import { getStoredUser } from "../api/session";

interface VehicleOwnerHeaderProps {
  onLogout: () => void;
  onMenuToggle: () => void;
}

export function VehicleOwnerHeader({ onLogout, onMenuToggle }: VehicleOwnerHeaderProps) {
  const user = getStoredUser();
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
          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotificationOpen(false)}
                />
                <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg max-h-96 overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notification.read ? "bg-blue-50" : ""
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {notification.title}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                {notification.timestamp}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        View all notifications
                      </Button>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
}
