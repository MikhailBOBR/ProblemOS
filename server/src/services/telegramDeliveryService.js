import { nowIso } from "../utils/id.js";
import { appendAuditLog } from "./auditLogService.js";

async function sendTelegramMessage(token, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram API error: ${response.status}`);
  }

  return body.result;
}

function dueForTelegram(notification, now = new Date()) {
  return (
    !notification.telegramDeliveredAt &&
    notification.sendAt &&
    new Date(notification.sendAt).getTime() <= now.getTime() &&
    ["deadline_soon", "deadline_missed", "workflow", "next_action"].includes(notification.type)
  );
}

export async function dispatchTelegramNotifications(data, {
  token = process.env.TELEGRAM_BOT_TOKEN,
  dryRun = false,
  actorId = "system",
  now = new Date()
} = {}) {
  const attempted = [];
  const skipped = [];

  for (const notification of data.notifications.filter((item) => dueForTelegram(item, now))) {
    const user = data.users.find((candidate) => candidate.id === notification.userId);
    if (!user?.telegramId) {
      skipped.push({ notificationId: notification.id, reason: "telegram_not_linked" });
      continue;
    }

    attempted.push({ notificationId: notification.id, telegramId: user.telegramId, title: notification.title });

    if (dryRun) {
      continue;
    }

    if (!token) {
      skipped.push({ notificationId: notification.id, reason: "token_missing" });
      continue;
    }

    try {
      await sendTelegramMessage(token, user.telegramId, `${notification.title}\n\n${notification.message}`);
      notification.telegramDeliveredAt = nowIso();
      notification.telegramStatus = "sent";
      appendAuditLog(data, {
        actorId,
        caseId: notification.caseId,
        entityType: "notification",
        entityId: notification.id,
        action: "notification.telegram_sent",
        title: "Уведомление отправлено в Telegram",
        details: { telegramId: user.telegramId }
      });
    } catch (error) {
      notification.telegramStatus = "failed";
      notification.telegramError = error.message;
      skipped.push({ notificationId: notification.id, reason: error.message });
    }
  }

  return {
    dryRun,
    attempted,
    skipped,
    sent: data.notifications.filter((item) => item.telegramStatus === "sent").length
  };
}
