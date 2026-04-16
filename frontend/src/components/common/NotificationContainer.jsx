import { useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";

/* ================= ICON ================= */

const NotificationIcon = ({ type }) => {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };
  return icons[type] || "ℹ";
};

/* ================= COLORS ================= */

const COLORS = {
  success: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  error: "bg-red-500/20 border-red-500/30 text-red-300",
  warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
  info: "bg-blue-500/20 border-blue-500/30 text-blue-300",
};

const PROGRESS_COLORS = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

/* ================= ITEM ================= */

const NotificationItem = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return (
    <div
      className={`group rounded-lg border ${COLORS[notification.type]} p-4 shadow-lg backdrop-blur-sm transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-lg font-bold">
          <NotificationIcon type={notification.type} />
        </div>

        <div className="flex-1">
          <p className="font-semibold">{notification.title}</p>
          <p className="text-sm opacity-90 mt-1 break-words">
            {notification.message}
          </p>
        </div>

        <button
          onClick={() => onClose(notification.id)}
          className="opacity-60 hover:opacity-100 transition"
        >
          ✕
        </button>
      </div>

      {notification.duration && (
        <div className="mt-2 h-1 bg-current opacity-20 rounded-full overflow-hidden">
          <div
            className={`h-full ${PROGRESS_COLORS[notification.type]}`}
            style={{
              animation: `shrink ${notification.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ================= CONTAINER ================= */

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;