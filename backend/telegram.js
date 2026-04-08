import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token) {
  console.log("TELEGRAM_BOT_TOKEN жок");
}

const bot = token ? new TelegramBot(token, { polling: true }) : null;

const SHOP_URL = process.env.SHOP_URL || "https://fashion-shop-1-fs8l.onrender.com";

if (bot) {
  bot.onText(/\/start/, async (msg) => {
    try {
      await bot.sendMessage(
        msg.chat.id,
        "Добро пожаловать в Bars 👕",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Открыть магазин",
                  url: SHOP_URL
                }
              ]
            ]
          }
        }
      );
      console.log("START OK:", msg.chat.id);
    } catch (e) {
      console.error("START ERROR:", e.message);
    }
  });
}

export async function sendTelegramMessage(text) {
  if (!bot || !chatId) {
    console.log("Telegram bot же TELEGRAM_CHAT_ID жок");
    return;
  }

  await bot.sendMessage(chatId, text);
}

export async function sendOrderAccepted(order) {
  if (!bot || !chatId) return;

  const itemsText = order.items
    .map((item, index) => `${index + 1}) ${item.name} x${item.qty} - ${item.price} сом`)
    .join("\n");

  const text = `
✅ Ваш заказ принят!

🆔 Заказ №${order.orderId}
👤 ${order.customerName}
📞 ${order.phone}
📍 ${order.address}

📦 Товары:
${itemsText}

💰 Сумма: ${order.total} сом
  `.trim();

  await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть магазин",
            url: SHOP_URL
          }
        ]
      ]
    }
  });
}

export async function sendOrderCompleted(orderId) {
  if (!bot || !chatId) return;

  await bot.sendMessage(
    chatId,
    `📦 Ваш заказ завершен!\n\nЗаказ №${orderId}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть магазин",
              url: SHOP_URL
            }
          ]
        ]
      }
    }
  );
}