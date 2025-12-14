// Clean, single-instance Express server for Telegram webhook
const express = require('express');
const app = express();

const BOT_TOKEN = '8543749708:AAFuygd1vrOU9Aa55BoJdfh-qSBCYLpT4Rw';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.APP_URL || 'https://ec7cac89858b.ngrok-free.app';

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.send('Bot server is running');
});

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
      responseText = `🎮 <b>Welcome to TWIXER, ${firstName}!</b>\n\n⚡ <b>Experience Gaming Like Never Before!</b>\n\n✨ <b>What You Get:</b>\n💰 Daily Rewards & Massive Bonuses\n🎡 Spin the Wheel - Win Big Prizes\n👥 Invite Friends, Earn Commissions\n⏰ Daily Check-in Streaks\n🏆 Leaderboards & Rankings\n\n🚀 <b>Ready to Start?</b>\nTap "Open Mini App" below and begin earning today!\n\n⭐ Join thousands of players winning amazing rewards!`;
      replyMarkup = { 
        inline_keyboard: [
          [{ text: '🎮 Play to Earn', web_app: { url: APP_URL } }],
          [{ text: '💬 Join Community', url: 'https://t.me/your_community' }, { text: '❓ Help', callback_data: 'help' }]
        ]
      };
    } else if (text === '/help') {
      responseText = `📖 <b>TWIXER Commands:</b>\n\n🎮 /start – Open the Mini App\n✅ /tasks – How tasks work\n🎡 /spin – How spins work\n📅 /daily – Daily check-in info\n👥 /invite – How invites work\n💰 /balance – Check your balance\n🆘 /support – Contact support\n\n<i>All features available in the Mini App!</i>`;
    } else if (text === '/tasks') {
      responseText = `✅ <b>How Tasks Work:</b>\n\n📋 Complete tasks inside the Mini App\n💰 Earn rewards for each completed task\n🎯 Track progress in the Tasks tab\n🔄 New tasks added regularly\n\n<b>Task Types:</b>\n• Follow us on socials\n• Join our community\n• Daily check-ins\n\n👉 Open the Mini App to start!`;
    } else if (text === '/spin') {
      responseText = `🎡 <b>How Spins Work:</b>\n\n🎲 Use the Wheel inside the Mini App\n🏆 <b>Prize Options:</b>\n  💎 USDT Rewards\n  🎁 Mystery Boxes\n  🎡 Free Spins\n  👑 VIP Passes\n  🧩 Exclusive Skins\n\n📊 See your spin history & results\n✨ Collect amazing prizes!\n\n👉 Spin now in the Mini App!`;
    } else if (text === '/daily') {
      responseText = `📅 <b>Daily Check-in Rewards:</b>\n\n✨ <b>Claim once per day:</b>\n  • Earn daily bonuses\n  • Build your streak\n  • Unlock higher rewards\n\n🔥 <b>Streak Benefits:</b>\n  Day 1-5: Normal rewards\n  Day 6-10: Bonus multiplier 1.5x\n  Day 11+: Bonus multiplier 2x\n\n⏰ Reset at midnight (UTC)\n\n👉 Claim your daily reward now!`;
    } else if (text === '/invite') {
      responseText = `👥 <b>Invite & Earn:</b>\n\n🔗 <b>Share Your Link:</b>\n  • Copy your unique invite link\n  • Share with friends\n  • Earn commission per referral\n\n💰 <b>Earn More By:</b>\n  ✅ Inviting active players\n  ✅ Building a network\n  ✅ Climbing the leaderboard\n\n📊 Track invites on the Leaderboard\n\n👉 Start inviting in the Mini App!`;
    } else if (text === '/balance') {
      responseText = `💰 <b>Check Your Balance:</b>\n\n📊 Open the Mini App\n🏠 Go to Home or Leaderboard tab\n💵 View your total balance\n\n<b>Balance includes:</b>\n  ✅ Task rewards\n  ✅ Daily bonuses\n  ✅ Spin prizes\n  ✅ Referral earnings\n\n👉 Open now to see your earnings!`;
    } else if (text === '/support') {
      responseText = `🆘 <b>Need Help?</b>\n\n📞 <b>Contact Support:</b>\n  • Open the Mini App\n  • Go to Support tab\n  • Reach out via the support contact\n\n⏱️ We respond quickly!\n\n<b>Common Issues:</b>\n  ❓ Tasks not updating\n  ❓ Balance missing\n  ❓ Can't claim rewards\n\n👉 Open the Mini App for instant support!`;
    } else {
      responseText = `👋 <b>Hey ${firstName}!</b>\n\n<b>Available Commands:</b>\n/start – Welcome & overview\n/tasks – How tasks work\n/spin – About spins\n/daily – Daily rewards\n/invite – Referral system\n/balance – Check balance\n/support – Get help\n\n🎮 Or tap "Open Mini App" above to dive in!`;
    }

    await sendMessage(chatId, responseText, replyMarkup);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

async function sendMessage(chatId, text, replyMarkup) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
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
