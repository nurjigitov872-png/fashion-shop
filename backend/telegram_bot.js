import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || '';
if (!token) throw new Error('8770827910:AAFqA78DFi8PfUtY_cfJxYLgkauptYehe0M');

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(
      msg.chat.id,
      '✅ Бот иштеп жатат.\n\nМагазин локально иштеп жатат, ошондуктан Telegram ичинен localhost ачылбайт.\nАдегенде сайтты интернетке чыгарабыз, анан “Онлайн магазин” кнопкасын кошобуз.'
    );
    console.log('START OK:', msg.chat.id);
  } catch (e) {
    console.error('START ERROR:', e.response?.body || e.message);
  }
});

console.log('Telegram бот иштеп жатат...');