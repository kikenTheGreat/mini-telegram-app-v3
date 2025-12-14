// Vercel Serverless Function for Telegram webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
      console.error('BOT_TOKEN is missing in environment variables');
      return res.status(500).json({ error: 'BOT_TOKEN not configured' });
    }

    const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const APP_URL = process.env.APP_URL || (host ? `https://${host}` : '');
    const baseUrl = (APP_URL || '').replace(/\/$/, '');
    const MINI_APP_URL = baseUrl ? `${baseUrl}/index.html` : '';
    
    console.log(`[Webhook] Generated MINI_APP_URL: ${MINI_APP_URL}`);

    const { message } = req.body || {};
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const firstName = message.from?.first_name || 'User';

    console.log(`[${new Date().toISOString()}] Message from ${firstName}: ${text}`);

    let responseText = '';
    let replyMarkup = null;

    if (text === '/start') {
      responseText = `🎮 <b>Welcome to TWIXER, ${firstName}!</b>\n\n⚡ <b>Experience Gaming Like Never Before!</b>\n\n✨ <b>What You Get:</b>\n💰 Daily Rewards & Massive Bonuses\n🎡 Spin the Wheel - Win Big Prizes\n👥 Invite Friends, Earn Commissions\n⏰ Daily Check-in Streaks\n🏆 Leaderboards & Rankings\n\n🚀 <b>Ready to Start?</b>\nTap "Open Mini App" below and begin earning today!\n\n⭐ Join thousands of players winning amazing rewards!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [
            [{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }],
            [{ text: '💬 Join Community', url: 'https://t.me/your_community' }, { text: '❓ Help', callback_data: 'help' }]
          ]
        };
      }
    } else if (text === '/help') {
      responseText = `📖 <b>TWIXER Commands:</b>\n\n🎮 /start – Open the Mini App\n✅ /tasks – How tasks work\n🎡 /spin – How spins work\n📅 /daily – Daily check-in info\n👥 /invite – How invites work\n💰 /balance – Check your balance\n🆘 /support – Contact support\n\n<i>All features available in the Mini App!</i>`;
    } else if (text === '/tasks') {
      responseText = `✅ <b>How Tasks Work:</b>\n\n📋 Complete tasks inside the Mini App\n💰 Earn rewards for each completed task\n🎯 Track progress in the Tasks tab\n🔄 New tasks added regularly\n\n<b>Task Types:</b>\n• Follow us on socials\n• Join our community\n• Daily check-ins\n\n👉 Open the Mini App to start!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else if (text === '/spin') {
      responseText = `🎡 <b>How Spins Work:</b>\n\n🎲 Use the Wheel inside the Mini App\n🏆 <b>Prize Options:</b>\n  💎 USDT Rewards\n  🎁 Mystery Boxes\n  🎡 Free Spins\n  👑 VIP Passes\n  🧩 Exclusive Skins\n\n📊 See your spin history & results\n✨ Collect amazing prizes!\n\n👉 Spin now in the Mini App!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else if (text === '/daily') {
      responseText = `📅 <b>Daily Check-in Rewards:</b>\n\n✨ <b>Claim once per day:</b>\n  • Earn daily bonuses\n  • Build your streak\n  • Unlock higher rewards\n\n🔥 <b>Streak Benefits:</b>\n  Day 1-5: Normal rewards\n  Day 6-10: Bonus multiplier 1.5x\n  Day 11+: Bonus multiplier 2x\n\n⏰ Reset at midnight (UTC)\n\n👉 Claim your daily reward now!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else if (text === '/invite') {
      responseText = `👥 <b>Invite & Earn:</b>\n\n🔗 <b>Share Your Link:</b>\n  • Copy your unique invite link\n  • Share with friends\n  • Earn commission per referral\n\n💰 <b>Earn More By:</b>\n  ✅ Inviting active players\n  ✅ Building a network\n  ✅ Climbing the leaderboard\n\n📊 Track invites on the Leaderboard\n\n👉 Start inviting in the Mini App!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else if (text === '/balance') {
      responseText = `💰 <b>Check Your Balance:</b>\n\n📊 Open the Mini App\n🏠 Go to Home or Leaderboard tab\n💵 View your total balance\n\n<b>Balance includes:</b>\n  ✅ Task rewards\n  ✅ Daily bonuses\n  ✅ Spin prizes\n  ✅ Referral earnings\n\n👉 Open now to see your earnings!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else if (text === '/support') {
      responseText = `🆘 <b>Need Help?</b>\n\n📞 <b>Contact Support:</b>\n  • Open the Mini App\n  • Go to Support tab\n  • Reach out via the support contact\n\n⏱️ We respond quickly!\n\n<b>Common Issues:</b>\n  ❓ Tasks not updating\n  ❓ Balance missing\n  ❓ Can't claim rewards\n\n👉 Open the Mini App for instant support!`;
      if (MINI_APP_URL) {
        replyMarkup = {
          inline_keyboard: [[{ text: '🎮 Play to Earn', web_app: { url: MINI_APP_URL } }]]
        };
      }
    } else {
      responseText = `👋 <b>Hey ${firstName}!</b>\n\n<b>Available Commands:</b>\n/start – Welcome & overview\n/tasks – How tasks work\n/spin – About spins\n/daily – Daily rewards\n/invite – Referral system\n/balance – Check balance\n/support – Get help\n\n🎮 Or tap "Open Mini App" above to dive in!`;
    }

    const sendRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup || undefined,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('Failed to send message:', errText);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
