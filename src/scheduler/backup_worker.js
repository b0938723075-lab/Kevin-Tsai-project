const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

// --- ⚙️ 設定區 ---
const VAULT_PATH = "C:\\Users\\User\\.gemini\\Kevin tsai moniter vault";

/**
 * 任務 A：同步到雲端 GitHub
 */
async function syncToGitHub() {
    console.log(`\n☁️ [雲端備份] ${new Date().toLocaleString()} - 啟動 GitHub 同步...`);
    try {
        await execAsync('git add .');
        const dateStr = new Date().toISOString().split('T')[0];
        const commitMsg = `🚀 自動日結備份：${dateStr}`;
        await execAsync(`git commit -m "${commitMsg}"`);
        await execAsync('git push origin main');
        console.log("✅ [雲端成功] 已同步至 GitHub。");
    } catch (err) {
        if (err.message.includes("nothing to commit") || err.message.includes("clean")) {
            console.log("⏭️ [雲端跳過] 無新變動。");
        } else {
            console.error("❌ [雲端失敗]:", err.message);
        }
    }
}

/**
 * 任務 B：同步到本地保險箱 (Vault)
 */
async function syncToLocalVault() {
    console.log(`\n🏠 [本地備份] ${new Date().toLocaleString()} - 啟動個人金庫同步...`);
    try {
        // 確保目標資料夾存在
        if (!fs.existsSync(VAULT_PATH)) {
            fs.mkdirSync(VAULT_PATH, { recursive: true });
        }

        // 使用 Windows 高效備份工具 robocopy
        // 排除 node_modules, .git, 原始大數據(data/raw), 日誌 以及 敏感私鑰(.env)
        const cmd = `robocopy "." "${VAULT_PATH}" /E /XD node_modules .git data/raw logs /XF .env /XO /R:1 /W:1`;
        
        try {
            await execAsync(cmd);
        } catch (execErr) {
            // Robocopy exit code 0-7 均代表成功或無變動
            if (execErr.code > 8) throw execErr;
        }
        
        console.log(`✅ [本地成功] 已備份至：${VAULT_PATH}`);
    } catch (err) {
        console.error("❌ [本地失敗]:", err.message);
    }
}

/**
 * 總出口：執行所有備份任務
 */
async function runAllBackups() {
    console.log("\n=====================================");
    console.log("  🛡️ 啟動全方位備份程序 (雲端 + 本地)");
    console.log("=====================================");
    
    await syncToGitHub();   // 跑雲端
    await syncToLocalVault(); // 跑本地
    
    console.log("\n✅ [守護完成] 雙重備份任務圓滿結案！");
}

module.exports = { runAllBackups };
