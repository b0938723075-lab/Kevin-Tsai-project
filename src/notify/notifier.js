const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function sendLinePush(message) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.LINE_USER_ID;
    
    if (!token || token.includes("請填在這裡") || !userId || userId.includes("請填在這裡")) {
        console.log("⚠️ 尚未設定 LINE Messaging API (替代 Notify)，跳過 LINE 通知。");
        return;
    }

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: userId,
            messages: [{ type: "text", text: message }]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ [LINE] 成功將報告推播到你的手機！");
    } catch (err) {
        console.error("❌ [LINE] 發送失敗:", err.response ? err.response.data : err.message);
    }
}

async function sendTelegram(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || token.includes("請填在這裡") || !chatId || chatId.includes("請填在這裡")) {
        console.log("⚠️ 尚未設定 Telegram，跳過 Telegram 通知。");
        return;
    }
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await axios.post(url, { chat_id: chatId, text: message });
        console.log("✅ [Telegram] 成功將報告發送到群組！");
    } catch (err) {
        console.error("❌ [Telegram] 發送失敗:", err.message);
    }
}

async function notifyAll() {
    console.log("=====================================");
    console.log("  📢 開始進行通知推播 (LINE & Telegram) ");
    console.log("=====================================\n");

    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(__dirname, `../../data/reports/${dateStr}.json`);

    if (!fs.existsSync(reportPath)) {
        console.error(`❌ 今日報告 (${dateStr}.json) 尚未建立，請先讓 AI 寫完整份分析！`);
        return;
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    // 根據情緒決定表情符號與開場白
    let icon = "🟢";
    let statusText = "【好評如潮】";
    if (reportData.score < 40) { icon = "🔴"; statusText = "【危機預警！】"; }
    else if (reportData.score < 70) { icon = "🟡"; statusText = "【反應兩極】"; }

    // 生成雲端預覽連結 (GitHub Preview)
    const reportURL = `https://htmlpreview.github.io/?https://github.com/b0938723075-lab/Kevin-Tsai-project/blob/main/data/articles/${dateStr}.html`;

    // 排版要發送到手機的微縮板精華報告
    const msg = `
【蔡康永 - AI 每日輿情簡報】
📆 ${dateStr}

${icon} 綜合情緒分數：${reportData.score}/100 ${statusText}
---------------------
👍 正面好評：
${reportData.positive_summary}

👎 警示事件：
${reportData.negative_summary}

🔗 點擊查看華麗版深度分析網頁：
${reportURL}
`;

    console.log(`📡 [準備中] 即將發送的推播內容摘要：\n\n${msg.trim()}\n`);
    
    // 平行發送給所有你設定的人員
    await sendLinePush(msg.trim());
    await sendTelegram(msg.trim());
    
    console.log(`\n✅ [通知模組完工] 所有報告發送程序已跑完！`);
}

if (require.main === module) {
    notifyAll();
}

module.exports = { notifyAll };
