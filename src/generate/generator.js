const fs = require('fs');
const path = require('path');

// ==========================================
// 🗓️ 歷史報告索引：掃描所有已生成報告的日期
// ==========================================
function getHistoryDates() {
    const articlesDir = path.join(__dirname, '../../data/articles');
    if (!fs.existsSync(articlesDir)) return [];
    return fs.readdirSync(articlesDir)
        .filter(f => f.endsWith('.html'))
        .map(f => f.replace('.html', ''))
        .sort((a, b) => b.localeCompare(a)); // 新到舊排序
}

// ==========================================
// 📊 一週摘要統整：讀取近七天報告並彙整
// ==========================================
function getWeeklySummary(currentDateStr) {
    const reportsDir = path.join(__dirname, '../../data/reports');
    if (!fs.existsSync(reportsDir)) return null;

    const allFiles = fs.readdirSync(reportsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a)); // 新到舊

    // 取最近 7 天的報告
    const recentFiles = allFiles.slice(0, 7);
    if (recentFiles.length === 0) return null;

    const reports = recentFiles.map(dateStr => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(reportsDir, `${dateStr}.json`), 'utf8'));
            return { date: dateStr, ...data };
        } catch (e) { return null; }
    }).filter(Boolean);

    if (reports.length === 0) return null;

    const avgScore = Math.round(reports.reduce((sum, r) => sum + (r.score || 0), 0) / reports.length);
    const dateRange = `${reports[reports.length - 1].date} ~ ${reports[0].date}`;

    // 計算趨勢方向
    let trend = '持平';
    if (reports.length >= 2) {
        const latest = reports[0].score || 0;
        const oldest = reports[reports.length - 1].score || 0;
        if (latest - oldest > 5) trend = '📈 上升';
        else if (oldest - latest > 5) trend = '📉 下降';
        else trend = '➡️ 持平';
    }

    return {
        dateRange,
        avgScore,
        trend,
        totalReports: reports.length,
        dailyScores: reports.map(r => ({ date: r.date, score: r.score || 0 }))
    };
}

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

    // 根據分數決定主題光環顏色 (心理諮商室-植物與暖木質色系)
    let glowColor = "rgba(102, 128, 77, 0.4)"; // 植栽綠意 (平靜和緩)
    let scoreText = "平穩安定";
    if (reportData.score < 40) {
        glowColor = "rgba(189, 115, 87, 0.4)"; // 陶盆磚紅 (需要關注)
        scoreText = "情緒起伏";
    } else if (reportData.score < 70) {
        glowColor = "rgba(224, 185, 133, 0.5)"; // 木質暖光 (適度波動)
        scoreText = "和緩漸進";
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
                    <h2 class="news-category-title" style="font-size: 1.5rem; margin-bottom: 1.5rem; color: var(--accent-blue); display: flex; align-items: center; gap: 10px;">
                        <span style="background: rgba(120, 144, 134, 0.15); padding: 5px 12px; border-radius: 8px;">${catName}</span>
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
    const newsHTML = newsSectionsHTML || '<p style="color: rgba(61, 64, 53, 0.5);">近期暫無相關動態可供顯示</p>';

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
            --bg-color: #E6D0BA; /* Warm milky tea / tan wall color */
            --card-bg: rgba(253, 248, 235, 0.6); /* Warm white frosted glass */
            --card-border: rgba(255, 255, 255, 0.85);
            --text-main: #4A3E33; /* Deep soft warm brownish charcoal */
            --text-sub: #8B7A66; /* Warm taupe for text */
            --accent-glow: ${glowColor};
            --accent-blue: #66804D; /* Plant green */
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Outfit', 'Noto Sans TC', sans-serif;
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 100% 0%, #FFF3DE 0%, transparent 40%),
                radial-gradient(circle at 0% 100%, #C9A98C 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, var(--accent-glow), transparent 60%);
            color: var(--text-main);
            min-height: 100vh;
            line-height: 1.6;
            margin: 0;
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
            opacity: 0.3;
            transition: opacity 0.5s ease;
            mix-blend-mode: overlay;
        }
        .header-bg:hover {
            opacity: 0.45;
        }
        header::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0; height: 80%;
            background: linear-gradient(to top, var(--bg-color) 10%, rgba(230, 208, 186, 0.7) 60%, transparent);
            z-index: 0;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            color: var(--text-main);
            margin-bottom: 0.5rem;
            letter-spacing: -1px;
            text-shadow: 0 4px 15px rgba(255,255,255,0.6);
        }
        .date-badge {
            display: inline-block;
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(10px);
            font-size: 0.875rem;
            letter-spacing: 2px;
            color: var(--text-sub);
            border: 1px solid var(--card-border);
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
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
            border-radius: 32px;
            padding: 2.5rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            animation: fadeInUp 0.8s ease-out backwards;
            box-shadow: 0 10px 40px -10px rgba(139, 140, 130, 0.12);
        }
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 50px -15px rgba(139, 140, 130, 0.2);
            border-color: rgba(255,255,255,1);
        }
        
        /* 記分板特效 */
        .score-card {
            text-align: center;
            grid-column: 1 / -1;
            background: linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 100%);
            position: relative;
            overflow: hidden;
        }
        .score-card::before {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: conic-gradient(transparent, transparent, transparent, var(--accent-glow));
            animation: rotate 15s linear infinite;
            z-index: 0;
            opacity: 0.3;
        }
        .score-card::after {
            content: '';
            position: absolute;
            inset: 3px;
            background: rgba(247, 245, 240, 0.95);
            border-radius: 30px;
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
            font-size: 2.5rem;
            margin-bottom: 1rem;
            display: inline-block;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text-main);
        }
        .card-text {
            color: var(--text-sub);
            font-size: 1rem;
            line-height: 1.8;
            font-weight: 400;
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
            color: var(--text-main);
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .news-card {
            display: block;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 4px 15px rgba(139, 140, 130, 0.05);
            padding: 1.5rem;
            border-radius: 20px;
            transition: all 0.3s ease;
        }
        .news-card:hover {
            background: rgba(255, 255, 255, 0.9);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(139, 140, 130, 0.1);
        }
        .news-source {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--accent-blue);
            margin-bottom: 0.5rem;
            display: block;
            font-weight: 600;
        }
        .news-title {
            color: var(--text-main);
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
            font-weight: 600;
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
            <p style="color: var(--accent-blue); font-size: 1.1rem; margin-top: 1.5rem; font-weight: 500;">
                重點收編：「書籍作品」、「主持節目」、「個人聲量」與「新聞評論」
            </p>
            <p style="color: var(--text-sub); margin-top: 0.5rem; font-size: 0.95rem;">
                由 AI 從 ${reportData.source_data_count} 筆近期熱門討論中為您萃取的輕量化大數據摘要。
            </p>
        </div>
    </header>

    <!-- 📅 歷史紀錄日期選擇器 -->
    ${(() => {
        const historyDates = getHistoryDates();
        if (historyDates.length <= 1) return '';
        return `
    <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem 2rem; animation-delay: 0.05s;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem;">📅</span>
                <span style="font-weight: 600; font-size: 1.1rem;">歷史紀錄文章</span>
                <span style="font-size: 0.85rem; color: var(--text-sub);">(共 ${historyDates.length} 篇報告)</span>
            </div>
            <select id="history-selector" onchange="if(this.value) window.location.href=this.value" style="
                font-family: 'Outfit', 'Noto Sans TC', sans-serif;
                font-size: 1rem;
                padding: 0.6rem 2rem 0.6rem 1rem;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.8);
                background: rgba(255,255,255,0.6);
                color: var(--text-main);
                cursor: pointer;
                backdrop-filter: blur(8px);
                appearance: auto;
                min-width: 200px;
            ">
                ${historyDates.map(d => {
                    const isToday = d === dateStr;
                    const weekday = ['日','一','二','三','四','五','六'][new Date(d).getDay()];
                    return `<option value="https://b0938723075-lab.github.io/Kevin-Tsai-project/data/articles/${d}.html" ${isToday ? 'selected' : ''}>${d} (週${weekday})${isToday ? ' ← 今日' : ''}</option>`;
                }).join('')}
            </select>
        </div>
    </div>`;
    })()}

    <div class="dashboard-grid">
        <!-- 分數卡片 -->
        <div class="glass-card score-card" style="animation-delay: 0.1s;">
            <div class="score-content">
                <div class="score-number">${reportData.score}</div>
                <div class="score-label">AI 綜合情緒評分 (${scoreText})</div>
            </div>
        </div>

        <!-- 社群動態卡片 -->
        <div class="glass-card" style="animation-delay: 0.2s;">
            <div class="card-icon">💎</div>
            <h2 class="card-title">個人社群動態</h2>
            <p class="card-text">${reportData.social_updates}</p>
        </div>

        <!-- 書籍作品卡片 -->
        <div class="glass-card" style="animation-delay: 0.3s; border-top: 2px solid rgba(224, 185, 133, 0.4);">
            <div class="card-icon">📚</div>
            <h2 class="card-title">書籍與作品分享</h2>
            <p class="card-text">${reportData.books_and_works}</p>
        </div>

        <!-- 主持節目卡片 -->
        <div class="glass-card" style="animation-delay: 0.4s;">
            <div class="card-icon">📺</div>
            <h2 class="card-title">主持節目及錄影</h2>
            <p class="card-text">${reportData.hosting_programs}</p>
        </div>

        <!-- 相關新聞卡片 -->
        <div class="glass-card" style="animation-delay: 0.5s;">
            <div class="card-icon">📰</div>
            <h2 class="card-title">相關新聞與報導</h2>
            <p class="card-text">${reportData.related_news}</p>
        </div>
    </div>

    <!-- 🗞 原始資料分類庫 (智能整合版) -->
    <div class="news-section">
        ${newsHTML}
    </div>

    <!-- 📊 一週摘要統整 -->
    ${(() => {
        const weekly = getWeeklySummary(dateStr);
        if (!weekly) return '';
        return `
    <div class="glass-card" style="margin-top: 3rem; animation-delay: 0.6s; border-top: 3px solid rgba(102, 128, 77, 0.5);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem;">
            <span style="font-size: 2rem;">📊</span>
            <h2 class="card-title" style="margin-bottom: 0;">一週摘要統整</h2>
            <span style="font-size: 0.85rem; color: var(--text-sub); margin-left: auto;">${weekly.dateRange}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
            <div style="text-align: center; padding: 1.2rem; background: rgba(255,255,255,0.5); border-radius: 16px;">
                <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${weekly.avgScore}</div>
                <div style="font-size: 0.85rem; color: var(--text-sub);">📌 本週平均情緒分數</div>
            </div>
            <div style="text-align: center; padding: 1.2rem; background: rgba(255,255,255,0.5); border-radius: 16px;">
                <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${weekly.trend}</div>
                <div style="font-size: 0.85rem; color: var(--text-sub);">📈 情緒趨勢方向</div>
            </div>
            <div style="text-align: center; padding: 1.2rem; background: rgba(255,255,255,0.5); border-radius: 16px;">
                <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${weekly.totalReports}</div>
                <div style="font-size: 0.85rem; color: var(--text-sub);">📄 本週報告天數</div>
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.4); border-radius: 12px; padding: 1rem 1.5rem;">
            <div style="font-weight: 600; margin-bottom: 0.8rem; font-size: 0.95rem;">📆 每日情緒分數走勢</div>
            <div style="display: flex; align-items: flex-end; gap: 8px; height: 80px;">
                ${weekly.dailyScores.reverse().map(d => {
                    const height = Math.max(10, d.score * 0.7);
                    const barColor = d.score >= 70 ? 'rgba(102,128,77,0.7)' : d.score >= 40 ? 'rgba(224,185,133,0.8)' : 'rgba(189,115,87,0.7)';
                    return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-main);">${d.score}</span>
                        <div style="width: 100%; height: ${height}px; background: ${barColor}; border-radius: 6px 6px 2px 2px; transition: height 0.5s ease;"></div>
                        <span style="font-size: 0.6rem; color: var(--text-sub); white-space: nowrap;">${d.date.slice(5)}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>`;
    })()}

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
