import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Inbox, MailOpen } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFamily } from "@/lib/FamilyContext";
import {
  markNotificationRead,
  markNotificationsRead,
  subscribeUserNotifications,
} from "@/services/notificationService";

function formatTimestamp(value) {
  try {
    const date = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "Just now";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Just now";
  }
}

function notificationTone(kind = "") {
  if (kind.includes("custody")) return "bg-blue-50 text-blue-700";
  if (kind.includes("invitation")) return "bg-indigo-50 text-indigo-700";
  if (kind.includes("task")) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function NotificationAction({ notification }) {
  const actionUrl = notification.actionUrl || "";
  if (!actionUrl) return null;

  const className = "inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:text-indigo-700";

  if (actionUrl.startsWith("/")) {
    return (
      <Link to={actionUrl} className={className}>
        Open <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <a href={actionUrl} target="_blank" rel="noreferrer" className={className}>
      Open <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default function NotificationInbox() {
  const { user, myEmail } = useFamily();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe = subscribeUserNotifications({
      email: myEmail || user?.email,
      onChange: (items) => {
        setNotifications(items);
        setLoading(false);
      },
      onError: (loadError) => {
        setError(loadError?.message || "Could not load notifications.");
        setLoading(false);
      },
    });

    return unsubscribe;
  }, [myEmail, user?.email]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => notification.status !== "read"),
    [notifications]
  );

  async function markOneRead(notification) {
    setSaving(true);
    setError("");
    try {
      await markNotificationRead(notification.id, user);
    } catch (markError) {
      setError(markError?.message || "Could not mark notification as read.");
    } finally {
      setSaving(false);
    }
  }

  async function markAllRead() {
    if (!unreadNotifications.length) return;

    setSaving(true);
    setError("");
    try {
      await markNotificationsRead(unreadNotifications, user);
    } catch (markError) {
      setError(markError?.message || "Could not mark notifications as read.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Inbox</p>
            <h2 className="text-xl font-black text-slate-950">In-app notifications</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {unreadNotifications.length} unread / {notifications.length} recent
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={markAllRead}
          disabled={saving || unreadNotifications.length === 0}
          className="gap-2 rounded-2xl"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            Loading notifications...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <Bell className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-black text-slate-950">No notifications yet</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Invitations and important updates will appear here.
            </p>
          </div>
        )}

        {notifications.map((notification) => {
          const unread = notification.status !== "read";

          return (
            <div
              key={notification.id}
              className={`rounded-2xl border px-4 py-3 transition ${
                unread
                  ? "border-indigo-200 bg-indigo-50/70"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${notificationTone(notification.kind)}`}>
                      {notification.kind?.replace(/_/g, " ") || "notification"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">{notification.title}</p>
                  {notification.body && (
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {notification.body}
                    </p>
                  )}
                  <div className="mt-2">
                    <NotificationAction notification={notification} />
                  </div>
                </div>

                {unread ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => markOneRead(notification)}
                    className="gap-2 rounded-xl"
                  >
                    <MailOpen className="h-3.5 w-3.5" /> Read
                  </Button>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Read
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
