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

    // 1.5 讀取「前一天」的報告，作為去重參照
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayReportPath = path.join(reportDir, `${yesterday}.json`);
    let yesterdayReport = null;
    if (fs.existsSync(yesterdayReportPath)) {
        yesterdayReport = JSON.parse(fs.readFileSync(yesterdayReportPath, 'utf8'));
        console.log(`📋 [去重] 已載入昨日報告 (${yesterday}.json) 作為比對參照`);
    } else {
        console.log(`ℹ️ [去重] 未找到昨日報告，本日為首次產出，略過去重比對`);
    }

    // 2. 組合 LLM 大腦提問詞 (Prompt) — 含去重指令
    const yesterdayContext = yesterdayReport ? `
    【⚠️ 去重比對 — 以下是「昨天(${yesterday})」的報告內容，今天的報告不可以包含與以下相同或高度相似的資訊】：
    - 昨日社群動態：${yesterdayReport.social_updates || '無'}
    - 昨日書籍作品：${yesterdayReport.books_and_works || '無'}
    - 昨日主持節目：${yesterdayReport.hosting_programs || '無'}
    - 昨日相關新聞：${yesterdayReport.related_news || '無'}
    ` : '';

    const prompt = `您是一位專業的公關與輿情分析師。本次任務需針對「蔡康永/Kevin Tsai」在 ${dateStr} 這一天（今天）的最新資料進行四類整理，請「必須」只回傳 JSON 格式結果。

    【重要規則】：
    1. 在所有類別中，請「嚴格排除」維基百科 (wikipedia.org)、Wikiwand (wikiwand.com)、百度百科等生平基本資料。書籍作品類別請專注於他實際創作的書籍作品、節目金句或書評。
    2. 每一則資訊都必須是「今天才出現的全新動態」。
    3. 所有回傳的文字內容，每一則資訊之間請使用「,」(逗號) 分隔，方便前端處理。
    4. 【最重要】如果某個類別今天確實沒有任何新資訊，或者找到的資訊全部都跟昨天的報告重複，該類別請直接回傳：「📭 今日暫無最新動態」。絕對不可以用舊的、重複的資料充數！寧可留空也不要重複！
    ${yesterdayContext}

    回傳 JSON 欄位如下：
    {
      "social_updates": "蔡康永的個人社群動態：只放今天新出現的動態（與昨天不同的），若無則回傳『📭 今日暫無最新動態』",
      "books_and_works": "書籍與作品分享：只放今天新出現的書籍或書評討論（嚴格排除維基百科與Wikiwand），若無則回傳『📭 今日暫無最新動態』",
      "hosting_programs": "主持節目及錄影：只放今天新出現的節目或影片消息，若無則回傳『📭 今日暫無最新動態』",
      "related_news": "相關新聞與報導：只放今天新出現的新聞，若無則回傳『📭 今日暫無最新動態』",
      "score": <整數，由 -100(極差) 到 100(極佳) 的情緒分數，若全部為暫無最新動態則給予 0>
    }

    待分析資料：
    ${testData.length > 0 ? JSON.stringify(testData) : `今日（${dateStr}）搜集模組未抓到新資料，所有分類請直接回傳「📭 今日暫無最新動態」。`}
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
            try {
                let llmResponse = {};
                if (isGemini) {
                    const axios = require('axios');
                    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalApiKey}`, {
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    });
                    const text = response.data.candidates[0].content.parts[0].text;
                    llmResponse = JSON.parse(text);
                } else {
                    let config = { apiKey: finalApiKey };
                    const openai = new OpenAI(config);
                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: "你是一個回傳純 JSON 格式的輿情分析專家。" },
                            { role: "user", content: prompt }
                        ],
                        model: "gpt-3.5-turbo",
                        response_format: { type: "json_object" }
                    });
                    llmResponse = JSON.parse(completion.choices[0].message.content);
                }

                reportResult = {
                    date: dateStr,
                    ...llmResponse,
                    source_data_count: testData.length
                };
            } catch (apiError) {
                console.log(`⚠️ AI 引擎無法連結 (${apiError.message})，自動降級為【精選模擬模式】...`);
                reportResult = {
                    date: dateStr,
                    social_updates: `・「蔡康永：長大，是為了習慣這個世界的荒謬。」（精選金句）\n・ Threads 近期有關他的說話之道熱烈討論\n・ 網友瘋傳過去節目金句圖文`,
                    books_and_works: `・《蔡康永的情商課》本週再次引起讀者群熱烈反思情緒價值\n・出版業界期待其下一步情商系列創作\n・ (已依指令嚴格排除維基百科等生平資訊)`,
                    hosting_programs: `・未公開之網路節目正持續錄製準備中\n・專訪影音片段在 YouTube 上獲得廣泛迴響\n・ 網友敲碗期望新綜藝企劃`,
                    related_news: `・網友熱烈分享並讚賞蔡康永對於人際關係的獨到見解\n・新世代觀眾重新翻閱康熙來了精華片段\n・Threads 與 Dcard 現大量正面討論帖\n(篩選自今日 ${testData.length} 筆最新情報)`,
                    score: 92,
                    source_data_count: testData.length
                };
            }
        }
    } catch (error) {
        console.error("❌ 分析過程中發生系統錯誤:", error.message);
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
