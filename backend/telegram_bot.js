import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN жок!');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(
      msg.chat.id,
      "✅ Бот иштеп жатат!\n\nМагазинден заказ берсең Telegram'га келет"
    );
    console.log('START OK:', msg.chat.id);
  } catch (e) {
    console.error('START ERROR:', e.message);
  }
});

console.log('Telegram бот иштеп жатат...');