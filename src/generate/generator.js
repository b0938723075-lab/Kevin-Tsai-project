const fs = require('fs');
const path = require('path');

async function generateHTML() {
    console.log("=====================================");
    console.log("  📝 開始寫文：生成華麗的分析網頁報告");
    console.log("=====================================\n");

    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(__dirname, `../../data/reports/${dateStr}.json`);
    const rawPath = path.join(__dirname, `../../data/raw/${dateStr}.json`);
    const articlesDir = path.join(__dirname, '../../data/articles');

    if (!fs.existsSync(articlesDir)) {
        fs.mkdirSync(articlesDir, { recursive: true });
    }

    if (!fs.existsSync(reportPath)) {
        console.error(`❌ 找不到今日的 AI 分析報告 (${dateStr}.json)，請先執行分析模組！`);
        return;
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let rawData = [];
    if (fs.existsSync(rawPath)) {
        rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    }

    console.log(`📂 [讀取] 準備將 ${reportData.source_data_count} 筆分析資料寫入網頁...`);

    // 根據分數決定主題光環顏色
    let glowColor = "rgba(16, 185, 129, 0.4)"; // 預設綠色 (高分)
    let scoreText = "好評如潮";
    if (reportData.score < 40) {
        glowColor = "rgba(239, 68, 68, 0.4)"; // 紅色 (低分)
        scoreText = "危機預警";
    } else if (reportData.score < 70) {
        glowColor = "rgba(245, 158, 11, 0.4)"; // 橘色 (中等)
        scoreText = "反應兩極";
    }

    // --- 🏷️ 多維度智能分類邏輯 (嚴格過濾版) ---
    const categories = {
        "💎 蔡康永個人社群動態": [],
        "📚 書籍作品與分享": [],
        "📺 主持節目及錄影": [],
        "📰 相關新聞與報導": []
    };

    rawData.forEach(item => {
        const text = (item.title + " " + (item.summary || "")).toLowerCase();
        const url = (item.url || "").toLowerCase();
        const source = (item.source || "").toLowerCase();

        // 1. 社群動態：必須是個人社群發文或相關的本人動態
        const isOfficialAccount = url.includes('kangyong');
        const isSocialPlatform = url.includes('facebook') || url.includes('instagram') || url.includes('threads') || url.includes('weibo');
        const isSocialPost = text.includes('發文') || text.includes('po文') || text.includes('粉專') || text.includes('個人動態');
        if (isOfficialAccount || (isSocialPlatform && isSocialPost)) {
            categories["💎 蔡康永個人社群動態"].push(item);
            return; // 命中後跳出
        }

        // 2. 書籍作品：必須明確提到知名著作、新書、書評或讀書心得
        const bookKeywords = ["說話之道", "说话之道", "情商課", "情商课", "因為這是你的人生", "男孩看見血地向前飛", "新書分享", "書評", "讀後感", "微信讀書"];
        if (bookKeywords.some(kw => text.includes(kw.toLowerCase()))) {
            categories["📚 書籍作品與分享"].push(item);
            return;
        }

        // 3. 主持節目：必須是特定他主持的節目名稱
        const showKeywords = ["康熙來了", "奇葩說", "真情指數", "兩代電力公司", "眾聲", "小姐不熙娣", "錄影", "主持崗位"];
        if (showKeywords.some(kw => text.includes(kw.toLowerCase()))) {
            categories["📺 主持節目及錄影"].push(item);
            return;
        }

        // 4. 新聞報導：過濾掉維基百科等雜訊，只留下明確的新聞媒體與新聞內容
        const isWiki = url.includes('wikipedia.org') || url.includes('wikiwand.com') || url.includes('scribd');
        const newsKeywords = ["新聞", "news", "報導", "記者", "yahoo", "tvbs", "ebc", "ettoday", "ltn", "udn", "setn", "chinatimes", "nownews", "鏡週刊", "三立", "東森", "自由", "中時", "壹蘋"];
        if (!isWiki && newsKeywords.some(kw => source.includes(kw) || url.includes(kw) || text.includes(kw))) {
            categories["📰 相關新聞與報導"].push(item);
            return;
        }
        
        // 如果上面都不符合 (例如：百科全書、不相關的購物網站等)，就會直接被拋棄，不顯示在報表中。
    });

    let newsSectionsHTML = "";
    for (const [catName, items] of Object.entries(categories)) {
        if (items.length > 0) {
            newsSectionsHTML += `
                <div class="news-category-block" style="margin-top: 3rem; animation: fadeInUp 0.8s ease-out;">
                    <h2 class="news-category-title" style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #38bdf8; display: flex; align-items: center; gap: 10px;">
                        <span style="background: rgba(56, 189, 248, 0.1); padding: 5px 12px; border-radius: 8px;">${catName}</span>
                        <small style="font-size: 0.9rem; color: var(--text-sub); font-weight: 300;">(${items.length} 筆資料)</small>
                    </h2>
                    <div class="news-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                        ${items.slice(0, 3).map(item => `
                            <a href="${item.url || '#'}" target="_blank" class="news-card">
                                <span class="news-source">${item.source}</span>
                                <h3 class="news-title">${item.title}</h3>
                                <p class="news-desc" style="-webkit-line-clamp: 2;">${item.summary || '點擊查看詳細內容'}</p>
                            </a>
                        `).join('')}
                        ${items.length > 3 ? `<p style="text-align: right; color: var(--text-sub); font-size: 0.85rem; margin-top: 10px; width: 100%; grid-column: 1 / -1;">...+ 還有 ${items.length - 3} 筆熱門討論</p>` : ''}
                    </div>
                </div>
            `;
        }
    }
    const newsHTML = newsSectionsHTML || '<p style="color: rgba(255,255,255,0.5);">今日暫無原始搜集資料可顯示</p>';

    // 建構充滿玻璃擬態 (Glassmorphism) 與高級動畫的網頁
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kevin Tsai 蔡康永 - 每日聲量與輿情控制台</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f111a;
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --accent-glow: ${glowColor};
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Outfit', 'Noto Sans TC', sans-serif;
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(56, 189, 248, 0.05), transparent 25%),
                radial-gradient(circle at 85% 30%, var(--accent-glow), transparent 25%);
            color: var(--text-main);
            min-height: 100vh;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }
        header {
            position: relative;
            text-align: center;
            margin-bottom: 4rem;
            padding: 6rem 2rem;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid var(--card-border);
            animation: fadeInDown 1s ease-out;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
        }
        .header-bg {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            /* 讀取 GitHub 雲端上的 banner 圖片作為背景 */
            background-image: url('https://b0938723075-lab.github.io/Kevin-Tsai-project/banner.png');
            background-size: cover;
            background-position: center 20%;
            z-index: 0;
            opacity: 0.4;
            transition: opacity 0.5s ease;
        }
        .header-bg:hover {
            opacity: 0.5;
        }
        header::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0; height: 60%;
            background: linear-gradient(to top, var(--bg-color), transparent);
            z-index: 0;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
            letter-spacing: -1px;
        }
        .date-badge {
            display: inline-block;
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            font-size: 0.875rem;
            letter-spacing: 2px;
            color: var(--text-sub);
            border: 1px solid var(--card-border);
        }
        
        /* 玻璃擬態卡片列 */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 4rem;
        }
        .glass-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 2.5rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeInUp 0.8s ease-out backwards;
        }
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
            border-color: rgba(255,255,255,0.15);
        }
        
        /* 記分板特效 */
        .score-card {
            text-align: center;
            grid-column: 1 / -1;
            background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
            position: relative;
            overflow: hidden;
        }
        .score-card::before {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: conic-gradient(transparent, transparent, transparent, var(--accent-glow));
            animation: rotate 10s linear infinite;
            z-index: 0;
            opacity: 0.5;
        }
        .score-card::after {
            content: '';
            position: absolute;
            inset: 3px;
            background: var(--bg-color);
            border-radius: 22px;
            z-index: 1;
        }
        .score-content { position: relative; z-index: 2; }
        .score-number {
            font-size: 6rem;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 0.5rem;
            text-shadow: 0 0 20px var(--accent-glow);
        }
        .score-label {
            font-size: 1.25rem;
            color: var(--text-sub);
            font-weight: 300;
            letter-spacing: 2px;
        }

        /* 分析清單 */
        .card-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
            display: inline-block;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #fff;
        }
        .card-text {
            color: var(--text-sub);
            font-size: 1rem;
            line-height: 1.8;
        }

        /* 原始新聞區塊 */
        .news-section {
            margin-top: 4rem;
            animation: fadeInUp 1s ease-out 0.4s backwards;
        }
        .news-section-title {
            font-size: 2rem;
            margin-bottom: 2rem;
            font-weight: 700;
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .news-card {
            display: block;
            text-decoration: none;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            padding: 1.5rem;
            border-radius: 16px;
            transition: all 0.2s ease;
        }
        .news-card:hover {
            background: rgba(255,255,255,0.06);
            transform: scale(1.02);
        }
        .news-source {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #38bdf8;
            margin-bottom: 0.5rem;
            display: block;
        }
        .news-title {
            color: #fff;
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
            font-weight: 500;
        }
        .news-desc {
            color: var(--text-sub);
            font-size: 0.875rem;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* 動畫設定 */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotate {
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            h1 { font-size: 2.5rem; }
            .score-number { font-size: 4rem; }
        }
    </style>
</head>
<body>

<div class="container">
    <header>
        <div class="header-bg"></div>
        <div class="header-content">
            <div class="date-badge">TREND REPORT: 2026.02 - 至今</div>
            <h1>Kevin Tsai 輿情精粹</h1>
            <p style="color: #38bdf8; font-size: 1.1rem; margin-top: 1.5rem; font-weight: 500;">
                重點收編：「書籍作品」、「主持節目」、「個人聲量」與「新聞評論」
            </p>
            <p style="color: var(--text-sub); margin-top: 0.5rem; font-size: 0.95rem;">
                由 AI 從 ${reportData.source_data_count} 筆近期熱門討論中為您萃取的輕量化大數據摘要。
            </p>
        </div>
    </header>

    <div class="dashboard-grid">
        <!-- 分數卡片 -->
        <div class="glass-card score-card" style="animation-delay: 0.1s;">
            <div class="score-content">
                <div class="score-number">${reportData.score}</div>
                <div class="score-label">AI 綜合情緒評分 (${scoreText})</div>
            </div>
        </div>

        <!-- 正面評價卡片 -->
        <div class="glass-card" style="animation-delay: 0.2s;">
            <div class="card-icon">✨</div>
            <h2 class="card-title">正面聲量與好評</h2>
            <p class="card-text">${reportData.positive_summary}</p>
        </div>

        <!-- 負面預警卡片 -->
        <div class="glass-card" style="animation-delay: 0.3s; border-top: 2px solid rgba(239, 68, 68, 0.4);">
            <div class="card-icon">⚡</div>
            <h2 class="card-title">危機預警與爭議</h2>
            <p class="card-text">${reportData.negative_summary}</p>
        </div>

        <!-- 趨勢風向卡片 -->
        <div class="glass-card" style="animation-delay: 0.4s; grid-column: auto / span 2;">
            <div class="card-icon">🧭</div>
            <h2 class="card-title">全網趨勢與風向</h2>
            <p class="card-text">${reportData.overall_trend}</p>
        </div>
    </div>

    <!-- 🗞 原始資料分類庫 (智能整合版) -->
    <div class="news-section">
        ${newsHTML}
    </div>
</div>

</body>
</html>
    `;

    // 4. 寫入 HTML 檔案 (按日期存檔)
    const outputPath = path.join(articlesDir, `${dateStr}.html`);
    fs.writeFileSync(outputPath, htmlContent.trim());

    // 5. 將最新報告複製一份到「首頁」 (根目錄 index.html)，解決 GitHub Pages 404 問題
    const rootIndexPath = path.join(__dirname, '../../index.html');
    fs.writeFileSync(rootIndexPath, htmlContent.trim());

    // 6. 同步更新「⭐最新報告請點我」資料夾
    const shortcutDir = path.join(__dirname, '../../⭐最新報告請點我');
    if (!fs.existsSync(shortcutDir)) fs.mkdirSync(shortcutDir, { recursive: true });
    fs.writeFileSync(path.join(shortcutDir, '網頁版精美報告.html'), htmlContent.trim());

    console.log(`✅ [完成] 華麗的網頁報告已成功產出！`);
    console.log(`🔗 檔案位置：data/articles/${dateStr}.html`);
    console.log(`🌐 首頁已同步：index.html (GitHub Pages 專用)`);
    return outputPath;
}

if (require.main === module) {
    generateHTML();
}

module.exports = { generateHTML };
