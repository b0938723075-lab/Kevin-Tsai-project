const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../pipeline.js');
const { runAllBackups } = require('./backup_worker.js');

const pathConfig = path.join(__dirname, '../../config/settings.json');
const settings = JSON.parse(fs.readFileSync(pathConfig, 'utf8'));

// 設定檔預設為 0 9 * * * (每天早上 9:00:00 執行)
const scheduleTime = settings.scheduler.cron_expression || "0 9 * * *";

console.log("==================================================");
console.log(`  ⏰ 排程守護者已啟動！`);
console.log(`  🕒 [任務 1] 每天上午 09:00 - 輿情報案簡報`);
console.log(`  🕒 [任務 2] 每天凌晨 02:00 - 雙重備份 (GitHub + 個人金庫)`);
console.log(`  ⚠️ 您可以縮小黑色視窗，它會 24 小時守護資料！`);
console.log("==================================================\n");

// 任務 1: 早上 9:00 執行輿情核心流程
cron.schedule(scheduleTime, async () => {
    console.log(`\n⏰ [任務觸發] ${new Date().toLocaleString()} - 開始生成今日簡報！`);
    await runPipeline();
});

// 任務 2: 凌晨 2:00 執行雙重備份
cron.schedule("0 2 * * *", async () => {
    await runAllBackups();
});
