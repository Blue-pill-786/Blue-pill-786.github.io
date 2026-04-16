/**
 * useRealtimeNotifications Hook
 * Custom hook for real-time notification management with WebSocket
 * Handles auto-reconnection, notification state, and preferences
 */

import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';

export const useRealtimeNotifications = () => {
  const { user } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);

  // Initialize Socket.io connection
  const initializeSocket = useCallback(() => {
    if (!user || !user.id || !user.organization) {
      console.warn('Waiting for user auth...');
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('auth_token');

    const socket = io(API_URL, {
      auth: {
        token,
        userId: user.id,
        organizationId: user.organization,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      loadNotifications();
      loadPreferences();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', () => {
      reconnectAttemptsRef.current += 1;
      console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}`);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after', maxReconnectAttempts, 'attempts');
      addNotification({
        title: 'Connection Lost',
        message: 'Unable to reconnect. Please refresh the page.',
        type: 'error',
      });
    });

    // Notification events
    socket.on('payment:received', (data) => handleNotification(data, 'success'));
    socket.on('payment:failed', (data) => handleNotification(data, 'error'));
    socket.on('payment:reminder', (data) => handleNotification(data, 'warning'));
    socket.on('payment:overdue', (data) => handleNotification(data, 'error'));
    socket.on('complaint:created', (data) => handleNotification(data, 'info'));
    socket.on('complaint:resolved', (data) => handleNotification(data, 'success'));
    socket.on('tenant:added', (data) => handleNotification(data, 'info'));
    socket.on('tenant:movein', (data) => handleNotification(data, 'info'));
    socket.on('tenant:moveout', (data) => handleNotification(data, 'warning'));
    socket.on('occupancy:updated', (data) => handleNotification(data, 'info'));
    socket.on('invoice:generated', (data) => handleNotification(data, 'info'));
    socket.on('system:alert', (data) => handleNotification(data, data.severity));
    socket.on('maintenance:updated', (data) => handleNotification(data, 'info'));
    socket.on('message:received', (data) => handleNotification(data, 'info'));
    socket.on('document:shared', (data) => handleNotification(data, 'info'));

    // Health check
    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000);

    socket.on('pong', () => {
      console.log('✨ Socket health check: OK');
    });

    socketRef.current = socket;

    // Cleanup on component unmount
    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [user, addNotification]);

  // Handle incoming notification
  const handleNotification = useCallback(
    (data, type = 'info') => {
      console.log('📬 Received notification:', data);

      // Show toast notification
      addNotification({
        id: data.id,
        title: data.message,
        message: data.description || '',
        type,
        icon: data.icon,
        actionUrl: data.actionUrl,
        duration: type === 'error' ? 0 : 5000, // Error notifications stay longer
      });

      // Add to local state
      setNotifications((prev) => [
        {
          id: data.id,
          ...data,
          isRead: false,
          createdAt: new Date(data.timestamp),
        },
        ...prev.slice(0, 49), // Keep last 50 in memory
      ]);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    },
    [addNotification]
  );

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load notifications');

      const result = await response.json();
      setNotifications(result.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load preferences');

      const result = await response.json();
      setPreferences(result.data);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/count/unread`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load unread count');

      const result = await response.json();
      setUnreadCount(result.data?.unreadCount || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('auth_token');

      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );

      // Decrease unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');

      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('auth_token');

      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPrefs),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      const result = await response.json();
      setPreferences(result.data);

      addNotification({
        title: 'Success',
        message: 'Notification preferences updated',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to update preferences',
        type: 'error',
      });
    }
  }, [addNotification]);

  // Initialize on mount
  useEffect(() => {
    const cleanup = initializeSocket();
    return cleanup;
  }, [initializeSocket]);

  return {
    isConnected,
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    loadNotifications,
    loadPreferences,
    getUnreadCount,
  };
};
