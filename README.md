# Fashion Shop Full Telegram

Бул толук даяр версия.
Ичинде бар:
- React + Vite frontend
- Node.js + Express backend
- SQLite база
- Admin panel
- Корзина
- Заказ
- Telegram бот
- Заказ болгондо Telegram'га автомат билдирүү
- Render үчүн `render.yaml`
- Vercel үчүн `vercel.json`

## Backend иштетүү
cd backend
npm install
npm run dev

## Frontend иштетүү
cd frontend
npm install
npm run dev

## Telegram бот иштетүү
cd backend
npm run bot

## backend/.env
PORT=8000
JWT_SECRET=өзүңдүн-секретиң
CORS_ORIGINS=http://localhost:5173
TELEGRAM_BOT_TOKEN=BotFather токени
TELEGRAM_ADMIN_CHAT_ID=5009694480
FRONTEND_URL=http://localhost:5173

## Admin login
admin@shop.local
admin123
