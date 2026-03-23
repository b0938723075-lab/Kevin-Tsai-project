console.log("✨ 啟動全自動化流程總機 (Pipeline)...");
const { collectData } = require('./collect/collector.js');
const { analyzeData } = require('./analyze/analyzer.js');
const { generateHTML } = require('./generate/generator.js');
const { notifyAll } = require('./notify/notifier.js');

async function runPipeline() {
    try {
        console.log("\n=====================================");
        console.log(" 🚀 [系統啟動] 全套流程大亂鬥開始！");
        console.log("=====================================\n");

        await collectData();            // Step 1: 網路爬蟲
        console.log("\n⬇️ 進入下一關...\n");
        await analyzeData();            // Step 2: AI 分析解讀
        console.log("\n⬇️ 進入下一關...\n");
        await generateHTML();           // Step 3: 設計與產出網頁
        console.log("\n⬇️ 進入下一關...\n");
        await notifyAll();              // Step 4: 通知當事人

        console.log("\n🎉 [全壘打] 四組任務全部接力成功，任務圓滿達成！");
    } catch (err) {
        console.error("\n❌ [Pipeline 炸裂] 某個模組發生嚴重錯誤停止了運行：", err);
    }
}

if (require.main === module) {
    runPipeline();
}

module.exports = { runPipeline };
