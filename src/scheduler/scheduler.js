const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../pipeline.js');

const pathConfig = path.join(__dirname, '../../config/settings.json');
const settings = JSON.parse(fs.readFileSync(pathConfig, 'utf8'));

// 設定檔預設為 0 9 * * * (每天早上 9:00:00 執行)
const scheduleTime = settings.scheduler.cron_expression || "0 9 * * *";

console.log("==================================================");
console.log(`  ⏰ 排程守護者已啟動！`);
console.log(`  🕒 下達鬧鐘時間：${scheduleTime} (也就是每天上午 9:00)`);
console.log(`  ⚠️ 您已經可以把這個黑色畫面縮下去掛網了，`);
console.log(`     它每一天都會在你刷牙的時候自己醒來幫你出報告！`);
console.log("==================================================\n");

// 這是 node-cron 的排程時間註冊表
cron.schedule(scheduleTime, async () => {
    console.log(`\n⏰ [鈴聲大作] ${new Date().toLocaleString()} - 排程觸發！開始執行自動化工作！`);
    await runPipeline();
});
