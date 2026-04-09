import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const SHOP_URL = process.env.SHOP_URL || "https://fashion-shop-1-fs8l.onrender.com";
const MBANK_NUMBER = "0704564756";

if (!token) {
  console.log("TELEGRAM_BOT_TOKEN жок");
}

const bot = token ? new TelegramBot(token, { polling: true }) : null;

/**
 * Кардардан чек кабыл алуу үчүн убактылуу абал сактайбыз
 * key = telegram chat id
 * value = { step: "order_id" | "photo", orderId?: string }
 */
const waitingForReceipt = new Map();

function mainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛍 Каталог", url: SHOP_URL }],
        [{ text: "💳 Чек жөнөтүү", callback_data: "send_receipt" }],
        [{ text: "📦 Заказдарым", callback_data: "my_orders" }],
        [{ text: "ℹ️ Жардам", callback_data: "help" }]
      ]
    }
  };
}

if (bot) {
  bot.onText(/\/start/, async (msg) => {
    try {
      console.log("START OK:", msg.chat.id);
      console.log("CHAT ID:", msg.chat.id);

      await bot.sendMessage(
        msg.chat.id,
        "Добро пожаловать в KG Style Bot 👕\n\nТөмөндөн керектүү бөлүмдү тандаңыз:",
        mainMenu()
      );
    } catch (e) {
      console.error("START ERROR:", e.message);
    }
  });

  bot.on("callback_query", async (query) => {
    try {
      const telegramChatId = query.message.chat.id;
      const data = query.data;

      if (data === "send_receipt") {
        waitingForReceipt.set(telegramChatId, { step: "order_id" });

        await bot.sendMessage(
          telegramChatId,
          "🧾 Заказ номериңизди жазыңыз.\n\nМисалы: 12"
        );
      }

      if (data === "my_orders") {
        await bot.sendMessage(
          telegramChatId,
          "📦 Заказдарыңызды сайттагы 'Менин заказдарым' бөлүмүнөн телефон номериңиз менен көрө аласыз.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Открыть магазин", url: SHOP_URL }]
              ]
            }
          }
        );
      }

      if (data === "help") {
        await bot.sendMessage(
          telegramChatId,
          `ℹ️ Жардам:
1) Сайттан товар тандаңыз
2) Заказ бериңиз
3) Мбанк / O!Деньги тандасаңыз, номерге төлөйсүз: ${MBANK_NUMBER}
4) Андан кийин боттон "Чек жөнөтүү" басып, заказ № жана чек сүрөтүн жибересиз`,
          mainMenu()
        );
      }

      await bot.answerCallbackQuery(query.id);
    } catch (e) {
      console.error("CALLBACK ERROR:", e.message);
    }
  });

  bot.on("message", async (msg) => {
    try {
      const telegramChatId = msg.chat.id;

      if (!waitingForReceipt.has(telegramChatId)) return;
      if (msg.text === "/start") return;

      const state = waitingForReceipt.get(telegramChatId);

      if (state.step === "order_id" && msg.text) {
        waitingForReceipt.set(telegramChatId, {
          step: "photo",
          orderId: msg.text.trim()
        });

        await bot.sendMessage(
          telegramChatId,
          `✅ Заказ №${msg.text.trim()} кабыл алынды.\nЭми чек сүрөтүн жибериңиз.`
        );
        return;
      }

      if (state.step === "photo" && msg.photo) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        const caption = `🧾 Жаңы чек келди

Заказ №${state.orderId}
Кардардын Telegram chat_id: ${telegramChatId}`;

        if (chatId) {
          await bot.sendPhoto(chatId, largestPhoto.file_id, {
            caption
          });
        }

        await bot.sendMessage(
          telegramChatId,
          `✅ Чек жөнөтүлдү!\n\nЗаказ №${state.orderId} текшерүүгө жөнөтүлдү.`,
          mainMenu()
        );

        waitingForReceipt.delete(telegramChatId);
      }
    } catch (e) {
      console.error("MESSAGE ERROR:", e.message);
    }
  });
}

export async function sendTelegramMessage(text) {
  if (!bot || !chatId) {
    console.log("Telegram bot же TELEGRAM_CHAT_ID жок");
    return;
  }

  await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
}

export async function sendOrderAccepted(order) {
  if (!bot || !chatId) return;

  const itemsText = order.items
    .map((item, index) => {
      const sizeText = item.size ? ` | ${item.size}` : "";
      const colorText = item.color ? ` | ${item.color}` : "";
      return `${index + 1}) ${item.name} x${item.qty}${sizeText}${colorText} - ${item.price} сом`;
    })
    .join("\n");

  let paymentText = "";
  if (order.payment_method === "mbank" || order.payment_method === "Мбанк" || order.payment_method === "О!Деньги") {
    paymentText = `💳 Мбанк / O!Деньги: ${MBANK_NUMBER}\n🧾 Төлөгөндөн кийин боттон "Чек жөнөтүү" басып, заказ № жана чек сүрөтүн жөнөтүңүз.`;
  } else if (order.payment_method === "cash" || order.payment_method === "Накталай") {
    paymentText = "💵 Накталай төлөм";
  } else if (order.payment_method === "card" || order.payment_method === "Карта") {
    paymentText = "💳 Карта аркылуу төлөм";
  } else {
    paymentText = `💰 Төлөм түрү: ${order.payment_method || "көрсөтүлгөн эмес"}`;
  }

  const text = `
✅ Ваш заказ принят!

🆔 Заказ №${order.orderId}
👤 ${order.customerName}
📞 ${order.phone}
📍 ${order.address}

${paymentText}

📦 Товары:
${itemsText}

💰 Сумма: ${order.total} сом
  `.trim();

  await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть магазин", url: SHOP_URL }],
        [{ text: "💳 Чек жөнөтүү", callback_data: "send_receipt" }]
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
          [{ text: "Открыть магазин", url: SHOP_URL }]
        ]
      }
    }
  );
}