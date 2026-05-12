import { JsonStore } from "../data/store.js";
import { handleTelegramUpdate } from "../services/telegramService.js";
import { fileURLToPath } from "node:url";

const TELEGRAM_API = "https://api.telegram.org";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function telegramRequest(token, method, payload) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram API error: ${response.status}`);
  }

  return body.result;
}

async function sendMessage(token, chatId, text) {
  if (!chatId || !text) {
    return;
  }

  await telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  });
}

export async function runTelegramPolling({
  token = process.env.TELEGRAM_BOT_TOKEN,
  dataFile = process.env.DATA_FILE,
  pollTimeoutSeconds = Number(process.env.TELEGRAM_POLL_TIMEOUT ?? 25)
} = {}) {
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const store = new JsonStore(dataFile);
  let offset = 0;
  console.log("ProblemOS Telegram polling started");

  while (true) {
    try {
      const updates = await telegramRequest(token, "getUpdates", {
        offset,
        timeout: pollTimeoutSeconds,
        allowed_updates: ["message", "edited_message", "callback_query"]
      });

      for (const update of updates) {
        offset = Math.max(offset, Number(update.update_id) + 1);
        const result = await store.mutate((data) => handleTelegramUpdate(data, update));
        await sendMessage(token, result.chatId, result.text);
      }
    } catch (error) {
      console.error(`[telegram] ${error.message}`);
      await sleep(3000);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTelegramPolling().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
