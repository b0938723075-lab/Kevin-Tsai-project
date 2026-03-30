const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function analyzeData() {
    console.log("=====================================");
    console.log("  🧠 開始分析【蔡康永/Kevin Tsai】輿情 ");
    console.log("=====================================\n");

    const dateStr = new Date().toISOString().split('T')[0];
    const rawPath = path.join(__dirname, `../../data/raw/${dateStr}.json`);
    const reportDir = path.join(__dirname, '../../data/reports');

    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    // 1. 讀取今日搜集資料
    if (!fs.existsSync(rawPath)) {
        console.error(`❌ 找不到今日資料 (${dateStr}.json)，請先確保搜集模組已正確執行！`);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    
    const testData = rawData.length > 0 ? rawData : [];

    console.log(`📂 [讀取] 準備對 ${testData.length} 筆資料進行情緒分析...`);

    // 2. 組合 LLM 大腦提問詞 (Prompt)
    const prompt = `您是一位專業的公關與輿情分析師。本次任務需針對「蔡康永/Kevin Tsai」自 2026 年 2 月以來的資料進行這四類整理，請「必須」只回傳 JSON 格式結果。

    【重要規則】：
    1. 在「書籍與作品分享」類別中，請「嚴格排除」維基百科、百度百科等生平基本資料，專注於他實際創作的書籍作品、節目金句或書評。
    2. 請在每一類別中，整理出「最新」的 3~5 則重點資訊。若該類別資料過多，請精選最新的 3~5 則；即使當天沒有足夠資料，也請根據提供的上下文或近期附近的資料，盡可能湊齊 3~5 則相關的近期動態。若完全無相關動態，才回傳『近期無相關動態』。

    回傳 JSON 欄位如下：
    {
      "social_updates": "1. 蔡康永的個人社群動態：3~5 則他在個人社群網站上發出的動態還有他說過的金句",
      "books_and_works": "2. 書籍與作品分享：3~5 則針對他出版的書籍作品與相關書評（嚴格排除百科資料）",
      "hosting_programs": "3. 主持節目及錄影：3~5 則他主持的節目或新拍攝影片消息",
      "related_news": "4. 相關新聞與報導：3~5 則與他本人直接相關的最新新聞",
      "score": <整數，由 -100(極差) 到 100(極佳) 的情緒分數>
    }

    待分析資料：
    ${testData.length > 0 ? JSON.stringify(testData) : "今日搜集模組未抓到新資料，請盡量基於您所知道的 2026 年 2 月以後的最新動態，為各類別補充 3~5 則資訊。"}
    `;

    let reportResult = {};

    try {
        // 檢查有沒有填 Key
        const apiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        let finalApiKey = apiKey;
        let isGemini = false;

        if (!apiKey || apiKey.includes("請填在這裡")) {
            if (geminiKey && !geminiKey.includes("請填在這裡")) {
                finalApiKey = geminiKey;
                isGemini = true;
            }
        }

        if (!finalApiKey || finalApiKey.includes("請填在這裡")) {
            console.log("\n⚠️ [注意] 尚未偵測到有效的 OpenAI 或 Gemini API Key，啟動【靜態模擬分析模式】...");
            const topTitles = testData.slice(0, 3).map(it => `・${it.title}`).join('\n');
            reportResult = {
                date: dateStr,
                social_updates: `[模擬資料]\n${topTitles}\n(註：此為系統抓取的前 3 筆新聞標題，非正式 AI 分析)`,
                books_and_works: `[模擬資料]\n・《說話之道》讀者熱烈迴響\n・近期暫無百科資料以外之實際出版動態`,
                hosting_programs: `[模擬資料]\n・蔡康永全新專訪上修\n・傳聞將有新網路節目企劃`,
                related_news: `[模擬資料]\n・網友熱烈討論蔡康永的高情商\n(相關新聞共篩選出 ${testData.length} 筆)`,
                score: 85,
                source_data_count: testData.length
            };
        } else {
            console.log(`🤖 正在呼叫 ${isGemini ? 'Gemini' : 'OpenAI'} 引擎進行深度語意運算...`);
            let config = { apiKey: finalApiKey };
            if (isGemini) {
                config.baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
            }
            const openai = new OpenAI(config);
            
            // 呼叫大語言模型
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "你是一個回傳純 JSON 格式的輿情分析專家。" },
                    { role: "user", content: prompt }
                ],
                model: isGemini ? "gemini-1.5-flash" : "gpt-3.5-turbo",
                response_format: { type: "json_object" }
            });
            const llmResponse = JSON.parse(completion.choices[0].message.content);
            reportResult = {
                date: dateStr,
                ...llmResponse,
                source_data_count: testData.length
            };
        }
    } catch (error) {
        console.error("❌ 分析過程中發生錯誤:", error.message);
        return;
    }

    // 3. 輸出分析結果報告
    const reportPath = path.join(reportDir, `${dateStr}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportResult, null, 2));

    console.log(`\n✅ [完成] 專業分析報告已產出！檔案位於：data/reports/${dateStr}.json`);
    console.log("\n📊 --- 本日輿情分析快報 ---");
    console.log(`📈 情緒分數: ${reportResult.score} 分 (滿分100)`);
    console.log(`💎 社群動態: ${reportResult.social_updates}`);
    console.log(`📚 書籍作品: ${reportResult.books_and_works}`);
    console.log(`📺 主持節目: ${reportResult.hosting_programs}`);
    console.log(`📰 相關新聞: ${reportResult.related_news}`);
    console.log("-----------------------------\n");
    
    return reportResult;
}

if (require.main === module) {
    analyzeData();
}

module.exports = { analyzeData };
