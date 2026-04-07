import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

let bot = null;

export function getTelegramBot() {
  if (!token) return null;
  if (!bot) bot = new TelegramBot(token, { polling: false });
  return bot;
}

export async function sendTelegramMessage(text) {
  try {
    const b = getTelegramBot();
    if (!b || !adminChatId) return false;
    await b.sendMessage(adminChatId, text, { parse_mode: 'HTML' });
    return true;
  } catch (error) {
    console.error('Telegram notify error:', error.message);
    return false;
  }
}

export function openShopKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: '🛍 Открыть магазин', web_app: { url: frontendUrl } }]],
      resize_keyboard: true
    }
  };
}
