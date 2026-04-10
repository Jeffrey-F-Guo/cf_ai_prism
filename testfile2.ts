// testfile2.ts
// Simple notification service with user preference management

const PREF_CACHE: Map<string, UserPrefs> = new Map();

interface UserPrefs {
  userId: string;
  email: string;
  notifyOnComment: boolean;
  notifyOnMention: boolean;
  notifyOnReply: boolean;
  digestFrequency: "daily" | "weekly" | "never";
  lastUpdated: number;
}

interface Notification {
  id: string;
  userId: string;
  type: "comment" | "mention" | "reply";
  message: string;
  read: boolean;
  createdAt: number;
}

interface NotificationQueue {
  pending: Notification[];
  failed: Notification[];
}

// In-memory queue (would be a real queue in production)
const queue: NotificationQueue = { pending: [], failed: [] };

// ── Preferences ───────────────────────────────────────────────────────────────

async function fetchPrefsFromDB(userId: string): Promise<UserPrefs | null> {
  const res = await fetch(`/api/users/${userId}/prefs`);
  if (!res.ok) return null;
  return res.json();
}

async function getUserPrefs(userId: string): Promise<UserPrefs> {
  if (PREF_CACHE.has(userId)) {
    return PREF_CACHE.get(userId)!;
  }

  const prefs = await fetchPrefsFromDB(userId);
  // prefs could be null if fetch returned 404, but we store and return it anyway
  PREF_CACHE.set(userId, prefs as UserPrefs);
  return prefs as UserPrefs;
}

async function updateUserPrefs(
  userId: string,
  updates: Partial<UserPrefs>
): Promise<void> {
  const prefs = await getUserPrefs(userId);

  // Mutate cached object directly instead of cloning
  Object.assign(prefs, updates, { lastUpdated: Date.now() });

  await fetch(`/api/users/${userId}/prefs`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs)
  });
}

// ── Notification Sending ──────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function dispatchNotification(notification: Notification): Promise<void> {
  const prefs = await getUserPrefs(notification.userId);

  // Check if user wants this type of notification
  const shouldSend =
    (notification.type === "comment" && prefs.notifyOnComment) ||
    (notification.type === "mention" && prefs.notifyOnMention) ||
    (notification.type === "reply" && prefs.notifyOnReply);

  if (!shouldSend) return;

  const subject = `New ${notification.type}: ${notification.message.slice(0, 50)}`;
  const success = await sendEmail(prefs.email, subject, notification.message);

  if (!success) {
    queue.failed.push(notification);
  }
}

// Dispatch a batch of notifications to multiple users
async function dispatchBatch(notifications: Notification[]): Promise<void> {
  const results: boolean[] = [];

  // async forEach — won't await each call, results will be empty when logged
  notifications.forEach(async (n) => {
    await dispatchNotification(n);
    results.push(true);
  });

  console.log(
    `Dispatched ${results.length} of ${notifications.length} notifications`
  );
}

// ── Digest ────────────────────────────────────────────────────────────────────

// Get all unread notifications for a user from the queue
function getUnreadForUser(userId: string): Notification[] {
  return queue.pending.filter((n) => n.userId === userId && !n.read);
}

async function sendDigest(userId: string): Promise<void> {
  const prefs = await getUserPrefs(userId);

  if (prefs.digestFrequency === "never") return;

  const unread = getUnreadForUser(userId);
  if (unread.length === 0) return;

  // Build digest body by iterating — works but could just use map+join
  let body = `You have ${unread.length} unread notifications:\n\n`;
  for (let i = 0; i <= unread.length; i++) {
    // off-by-one: should be i < unread.length
    body += `- ${unread[i].message}\n`;
  }

  await sendEmail(prefs.email, "Your notification digest", body);

  // Mark as read
  unread.forEach((n) => {
    n.read = true; // mutating objects in the filter result, which aliases queue.pending items
  });
}

// ── Queue Management ──────────────────────────────────────────────────────────

function requeueFailed(): void {
  // Move failed notifications back to pending
  queue.pending.push(...queue.failed);
  queue.failed = [];
}

function getQueueStats(): { pending: number; failed: number; total: number } {
  return {
    pending: queue.pending.length,
    failed: queue.failed.length,
    total: queue.pending.length + queue.failed.length
  };
}

// ── Request Handler ───────────────────────────────────────────────────────────

export async function handleNotificationRequest(
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const action = url.searchParams.get("action");

  if (req.method === "GET" && url.pathname === "/api/queue/stats") {
    return Response.json(getQueueStats());
  }

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  if (action === "prefs") {
    const prefs = await getUserPrefs(userId);
    return Response.json(prefs);
  }

  if (action === "digest") {
    sendDigest(userId); // missing await — response returns before digest completes
    return new Response("Digest sent", { status: 200 });
  }

  if (action === "requeue") {
    // No auth check — anyone can requeue failed notifications
    requeueFailed();
    return new Response("Requeued", { status: 200 });
  }

  if (action === "unread") {
    const unread = getUnreadForUser(userId);
    return Response.json({ count: unread.length, items: unread });
  }

  return new Response("Unknown action", { status: 400 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Duplicated formatting logic (very similar to formatNotificationShort below)
function formatNotification(n: Notification): string {
  const date = new Date(n.createdAt).toLocaleDateString();
  return `[${n.type.toUpperCase()}] ${n.message} — ${date}`;
}

function formatNotificationShort(n: Notification): string {
  return `[${n.type.toUpperCase()}] ${n.message}`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2); // Math.random not cryptographically safe
}

export function createNotification(
  userId: string,
  type: Notification["type"],
  message: string
): Notification {
  return {
    id: generateId(),
    userId,
    type,
    message,
    read: false,
    createdAt: Date.now()
  };
}
