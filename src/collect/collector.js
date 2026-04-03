const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pathConfig = path.join(__dirname, '../../config/settings.json');
const settings = JSON.parse(fs.readFileSync(pathConfig, 'utf8'));

async function collectData() {
    console.log("=====================================");
    console.log("  🚀 開始搜集【蔡康永/Kevin Tsai】輿情 ");
    console.log("=====================================\n");
    
    const primaryKeywords = settings.keywords.primary; // ["蔡康永", "Kevin Tsai", ...]
    
    // 擴充關鍵字，增加社群平台與特定主題的搜尋
    let keywords = [...primaryKeywords];
    if (settings.sources.ptt_enabled) keywords.push("蔡康永 PTT");
    if (settings.sources.dcard_enabled) keywords.push("蔡康永 Dcard");
    keywords.push("蔡康永 site:threads.net");
    keywords.push("蔡康永 site:facebook.com");
    
    // 動態計算「昨天」的日期，確保只抓取近 24 小時的最新資料
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`📅 [時間範圍] 搜尋區間：${yesterday} ~ ${todayStr} (僅抓取當天資料)`);
    const searchQuery = primaryKeywords.join(' ') + ` after:${yesterday}`;
    let results = [];

    // ==========================================
    // 🌐 1. Tavily AI 搜集 (優先)
    // ==========================================
    if (settings.sources.tavily_enabled) {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey || tavilyKey.includes("請填在這裡")) {
            console.log(`⚠️ [Tavily] 尚未設定 API Key，跳過 Tavily 搜集。`);
        } else {
            console.log(`📡 [Tavily] 正在啟動 AI 搜尋引擎...`);
            try {
                const response = await axios.post('https://api.tavily.com/search', {
                    api_key: tavilyKey,
                    query: searchQuery,
                    search_depth: "advanced",
                    include_images: false,
                    max_results: 10
                });
                
                const tavilyItems = (response.data.results || []).map(item => ({
                    source: 'Tavily',
                    title: item.title,
                    url: item.url,
                    summary: item.content,
                    publishedAt: new Date().toISOString()
                }));
                
                results = results.concat(tavilyItems);
                console.log(`✅ [Tavily] 成功獲取 ${tavilyItems.length} 筆相關資訊\n`);
            } catch (error) {
                console.error(`❌ [Tavily] 發生錯誤:`, error.message);
            }
        }
    }

    // ==========================================
    // 🌐 2. Apify 雲端爬蟲搜集 (需要 API Token)
    // ==========================================
    if (settings.sources.apify_enabled) {
        const apifyToken = process.env.APIFY_API_TOKEN;
        if (!apifyToken || apifyToken.includes("請填在這裡")) {
            console.log(`⚠️ [Apify] 尚未設定 API Token，跳過 Apify 搜集。`);
        } else {
            console.log(`📡 [Apify] 正在啟動雲端爬蟲 (rag-web-browser Actor)...`);
            try {
                const client = new ApifyClient({ token: apifyToken });

                for (const keyword of keywords) {
                    console.log(`  🔍 [Apify] 搜尋關鍵字: ${keyword}`);
                    try {
                        const run = await client.actor('apify/rag-web-browser').call({
                            query: `${keyword} after:${yesterday}`,
                            maxResults: 3,
                            outputFormats: ['text'],
                            requestTimeoutSecs: 30
                        });

                        const { items } = await client.dataset(run.defaultDatasetId).listItems();
                        
                        const apifyItems = items.map(item => ({
                            source: 'Apify',
                            title: item.metadata?.title || item.searchResult?.title || '來自 Apify 的搜尋結果',
                            url: item.metadata?.url || item.searchResult?.url || '',
                            summary: (item.text || item.markdown || '').substring(0, 300) + '...',
                            publishedAt: new Date().toISOString()
                        }));

                        results = results.concat(apifyItems);
                        console.log(`  ✅ 關鍵字「${keyword}」透過 Apify 取得 ${apifyItems.length} 筆資料`);
                    } catch (actorError) {
                        console.error(`  ⚠️ 關鍵字「${keyword}」Apify 搜集失敗:`, actorError.message);
                    }
                }
                console.log(`✅ [Apify] 雲端爬蟲搜集完成\n`);
            } catch (error) {
                console.error(`❌ [Apify] 初始化失敗:`, error.message);
            }
        }
    }

    // ==========================================
    // 🦆 3. DuckDuckGo 搜集 (備案，當主力引擎資料不足時啟動)
    // ==========================================
    const minRequiredResults = 5; // 期望的最少資料筆數
    if (settings.sources.duckduckgo_enabled && results.length < minRequiredResults) {
        console.log(`📡 [DuckDuckGo] 由於主力引擎提供的資料不足 ${minRequiredResults} 筆，啟動 DuckDuckGo 備案搜尋...`);
        try {
            
            const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const ddgItems = [];
            
            $('.result').each((i, el) => {
                if (ddgItems.length >= 5) return false;
                const title = $(el).find('.result__title a').text().trim();
                const url = $(el).find('.result__url').attr('href');
                let realUrl = url;
                if (url && url.startsWith('//duckduckgo.com/l/?uddg=')) {
                    const urlObj = new URL('https:' + url);
                    realUrl = decodeURIComponent(urlObj.searchParams.get('uddg'));
                }
                const summary = $(el).find('.result__snippet').text().trim();
                
                if (title && realUrl) {
                    ddgItems.push({
                        source: 'DuckDuckGo',
                        title: title,
                        url: realUrl,
                        summary: summary,
                        publishedAt: new Date().toISOString()
                    });
                }
            });

            if (ddgItems.length > 0) {
                results = results.concat(ddgItems);
                console.log(`✅ [DuckDuckGo] 成功獲取 ${ddgItems.length} 筆備用資訊\n`);
            } else {
                console.log(`⚠️ [DuckDuckGo] 備用引擎也無法獲取資訊。\n`);
            }
        } catch (error) {
            console.error(`❌ [DuckDuckGo] 發生錯誤:`, error.message);
        }
    } else if (settings.sources.duckduckgo_enabled && results.length >= minRequiredResults) {
        console.log(`⏭️ [DuckDuckGo] 主力引擎已搜集到足夠資料 (${results.length} 筆)，自動跳過 DuckDuckGo 搜尋以節省效能\n`);
    }

    // ==========================================
    // 🧹 4. 資料去重（根據 URL 去除重複）
    // ==========================================
    const uniqueUrls = new Set();
    const deduped = results.filter(item => {
        if (!item.url || uniqueUrls.has(item.url)) return false;
        uniqueUrls.add(item.url);
        return true;
    });

    console.log(`🧹 [去重] 原始 ${results.length} 筆 → 去重後 ${deduped.length} 筆`);

    // ==========================================
    // 💾 5. 儲存結果
    // ==========================================
    const dateStr = new Date().toISOString().split('T')[0];
    const outputDir = path.join(__dirname, '../../data/raw');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${dateStr}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
    
    console.log(`\n📂 [完成] 搜集資料已成功寫入資料庫：data/raw/${dateStr}.json`);
    console.log(`📊 [統計] 共搜集 ${deduped.length} 筆不重複的資料\n`);

    // 輸出各來源統計
    const sourceCount = {};
    deduped.forEach(item => {
        sourceCount[item.source] = (sourceCount[item.source] || 0) + 1;
    });
    console.log(`📋 [來源分佈]:`);
    Object.entries(sourceCount).forEach(([src, count]) => {
        console.log(`   ${src}: ${count} 筆`);
    });
    console.log('');

    return deduped;
}

// 允許直接在終端機中測試執行
if (require.main === module) {
    collectData();
}

module.exports = { collectData };
