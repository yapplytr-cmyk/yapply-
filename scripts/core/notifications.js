/**
 * notifications.js
 * Server-side notification system using Supabase.
 * Stores notifications in the public.notifications table.
 * Supports realtime subscriptions for live badge updates.
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

// In-memory cache for quick access (avoids repeated DB hits)
let _cache = {};
let _realtimeChannel = null;
let _onChangeCallbacks = [];

/**
 * Add a notification for a target user (server-side insert).
 * Can be called by any authenticated user to notify another user.
 */
export async function addNotification(targetUserId, { type, message, title, href, listingId, bidId, senderUserId }) {
  if (!targetUserId) return null;

  try {
    const supabase = await getSupabaseClient();
    console.log("[yapply-notif] Inserting notification for user:", targetUserId, "type:", type);
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: targetUserId,
        type: type || "general",
        title: title || "",
        message: message || "",
        href: href || "",
        listing_id: listingId || null,
        bid_id: bidId || null,
        sender_user_id: senderUserId || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[yapply-notif] Failed to add notification:", error.message, error.code, error.details);
      return null;
    }
    console.log("[yapply-notif] Notification inserted OK:", data?.id);

    // Trigger push notification via Edge Function (fire-and-forget)
    try {
      supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: targetUserId,
          title: title || "",
          message: message || "",
          type: type || "general",
          href: href || "",
          listing_id: listingId || null,
          bid_id: bidId || null,
        },
      }).catch((pushErr) => {
        console.warn("[yapply-notif] Push send error:", pushErr?.message);
      });
    } catch (_) {}

    // Update local cache
    if (_cache[targetUserId]) {
      _cache[targetUserId].unshift(data);
      _cache[targetUserId] = _cache[targetUserId].slice(0, 50);
    }

    _fireOnChange(targetUserId);
    return data;
  } catch (err) {
    console.warn("[yapply-notif] addNotification error:", err?.message);
    return null;
  }
}

/**
 * Fetch notifications for a user from Supabase (most recent 50).
 */
export async function getNotifications(userId) {
  if (!userId) return [];

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[yapply-notif] Failed to fetch notifications:", error.message);
      return _cache[userId] || [];
    }

    _cache[userId] = data || [];
    return _cache[userId];
  } catch (err) {
    console.warn("[yapply-notif] getNotifications error:", err?.message);
    return _cache[userId] || [];
  }
}

/**
 * Get unread notifications for a user.
 */
export async function getUnreadNotifications(userId) {
  if (!userId) return [];

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[yapply-notif] Failed to fetch unread:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("[yapply-notif] getUnreadNotifications error:", err?.message);
    return [];
  }
}

/**
 * Get the count of unread notifications (lightweight query).
 */
export async function getUnreadCount(userId) {
  if (!userId) return 0;

  try {
    const supabase = await getSupabaseClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.warn("[yapply-notif] Failed to get unread count:", error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.warn("[yapply-notif] getUnreadCount error:", err?.message);
    return 0;
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId) {
  if (!userId) return;

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.warn("[yapply-notif] Failed to mark all read:", error.message);
      return;
    }

    // Update cache
    if (_cache[userId]) {
      _cache[userId].forEach((n) => { n.read = true; });
    }

    _fireOnChange(userId);
  } catch (err) {
    console.warn("[yapply-notif] markAllRead error:", err?.message);
  }
}

/**
 * Delete ALL notifications for a user (clear inbox).
 */
export async function deleteAllNotifications(userId) {
  if (!userId) return;

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.warn("[yapply-notif] Failed to delete all notifications:", error.message);
      return;
    }

    // Clear cache
    _cache[userId] = [];
    _fireOnChange(userId);
    console.log("[yapply-notif] All notifications deleted for user:", userId);
  } catch (err) {
    console.warn("[yapply-notif] deleteAllNotifications error:", err?.message);
  }
}

/**
 * Mark a single notification as read.
 */
export async function markRead(notificationId, userId) {
  if (!notificationId) return;

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      console.warn("[yapply-notif] Failed to mark read:", error.message);
      return;
    }

    // Update cache
    if (_cache[userId]) {
      const notif = _cache[userId].find((n) => n.id === notificationId);
      if (notif) notif.read = true;
    }

    _fireOnChange(userId);
  } catch (err) {
    console.warn("[yapply-notif] markRead error:", err?.message);
  }
}

/**
 * Subscribe to realtime notification changes for a user.
 * Calls the callback whenever a new notification arrives or changes.
 */
export async function subscribeToNotifications(userId, callback) {
  if (!userId) return;

  if (typeof callback === "function") {
    _onChangeCallbacks.push({ userId, callback });
  }

  // Only set up one realtime channel
  if (_realtimeChannel) return;

  try {
    const supabase = await getSupabaseClient();
    _realtimeChannel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new;
          if (_cache[userId]) {
            _cache[userId].unshift(newNotif);
            _cache[userId] = _cache[userId].slice(0, 50);
          }
          _fireOnChange(userId);
        }
      )
      .subscribe();

    console.log("[yapply-notif] Realtime subscription active for user:", userId);
  } catch (err) {
    console.warn("[yapply-notif] Realtime subscription error:", err?.message);
  }
}

/**
 * Unsubscribe from realtime notifications (e.g. on logout).
 */
export async function unsubscribeFromNotifications() {
  if (_realtimeChannel) {
    try {
      const supabase = await getSupabaseClient();
      await supabase.removeChannel(_realtimeChannel);
    } catch (_) {}
    _realtimeChannel = null;
  }
  _onChangeCallbacks = [];
  _cache = {};
}

/**
 * Register a callback for notification changes.
 */
export function onNotificationChange(userId, callback) {
  if (typeof callback === "function") {
    _onChangeCallbacks.push({ userId, callback });
  }
}

function _fireOnChange(userId) {
  _onChangeCallbacks.forEach((entry) => {
    if (entry.userId === userId && typeof entry.callback === "function") {
      try { entry.callback(); } catch (_) {}
    }
  });
}
