const express = require('express');
const app = express();

// Bot config
const BOT_TOKEN = '8543749708:AAFuygd1vrOU9Aa55BoJdfh-qSBCYLpT4Rw';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
// Update APP_URL when your ngrok URL changes, or set APP_URL env var before starting.
const APP_URL = process.env.APP_URL || 'https://ec7cac89858b.ngrok-free.app';

app.use(express.json());
app.use(express.static(__dirname));

// Health check
app.get('/', (req, res) => {
  res.send('Bot server is running');
});

// Webhook endpoint - receives messages from Telegram
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const firstName = message.from.first_name || 'User';

    console.log(`[${new Date().toISOString()}] Message from ${firstName}: ${text}`);

    let responseText = '';
    let replyMarkup = null;

    if (text === '/start') {
      responseText = `🎮 Welcome, ${firstName}!\nTap the button below to open the Mini App and start earning.`;
      replyMarkup = { inline_keyboard: [[{ text: 'Open Mini App', web_app: { url: APP_URL } }]] };
    } else if (text === '/help') {
      responseText = `📖 Commands:\n/start – Open the Mini App\n/tasks – How tasks and rewards work\n/spin – How spins work\n/daily – Daily check-in info\n/invite – How invites/rewards work\n/balance – Where to see your balance (inside app)\n/support – Contact support`;
    } else if (text === '/tasks') {
      responseText = `✅ Tasks:\n- Complete listed tasks inside the Mini App\n- Rewards add to your in-app balance\n- Check progress in the Tasks tab`;
    } else if (text === '/spin') {
      responseText = `🎡 Spins:\n- Use the wheel inside the Mini App\n- Prizes include USDT, boxes, passes\n- Each spin result is saved in history`;
    } else if (text === '/daily') {
      responseText = `📅 Daily Check-in:\n- Claim once per day inside the app\n- Streaks improve rewards`;
    } else if (text === '/invite') {
      responseText = `👥 Invites:\n- Use your invite link in the app\n- Friends who join help your stats\n- See leaderboard in the app`;
    } else if (text === '/balance') {
      responseText = `💰 Balance:\n- Open the Mini App and check your balance on the home/leaderboard sections.`;
    } else if (text === '/support') {
      responseText = `🆘 Support:\n- Reach out via the support username shown in the app.`;
    } else {
      responseText = `👋 Hey ${firstName}! I handle commands and guide you.\nTry /start to open the Mini App or /help for commands.`;
    }

    await sendMessage(chatId, responseText, replyMarkup);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Function to send message via Telegram API
async function sendMessage(chatId, text, replyMarkup) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup || undefined
      })
    });

    if (!response.ok) {
      console.error('Failed to send message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

const PORT = 5500;
app.listen(PORT, () => {
  console.log(`🤖 Bot server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook at ${APP_URL}/webhook`);
});
