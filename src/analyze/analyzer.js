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
    
    // 如果今天沒成功抓到資料，我塞入兩筆模擬新聞讓他可以測試分析大腦功能
    const testData = rawData.length > 0 ? rawData : [
        {
            title: "蔡康永最新專訪：說話之道與高情商",
            summary: "在最新一集的專訪中，蔡康永幽默風趣地分享了他在娛樂圈應對各種挑戰的心法，引起眾多網友熱烈討論與好評。",
            source: "TestNews"
        },
        {
            title: "網友針對蔡康永新書內容兩極評論",
            summary: "部分讀者認為蔡康永最新出版的書中提及的人際關係處理方法太過理想脫離現實，引發部分爭議。",
            source: "TestForum"
        }
    ];

    console.log(`📂 [讀取] 準備對 ${testData.length} 筆資料進行情緒分析...`);

    // 2. 組合 LLM 大腦提問詞 (Prompt)
    const prompt = `您是一位專業的公關與輿情分析師。請根據以下搜集到的關於「蔡康永」最新資料，進行深度分析，並「必須」只回傳 JSON 格式結果，欄位如下：
    {
      "positive_summary": "正面評價與好評摘要",
      "negative_summary": "負面輿論預警與爭議點",
      "overall_trend": "整體趨勢與輿論風向",
      "score": <整數，由 -100(極差) 到 100(極佳) 的情緒分數>
    }

    待分析資料：
    ${JSON.stringify(testData)}
    `;

    let reportResult = {};

    try {
        // 檢查有沒有填 Key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey.includes("請填在這裡")) {
            console.log("\n⚠️ [注意] 尚未偵測到有效的 OpenAI API Key，啟動【模擬分析模式】...");
            // 如果沒填密碼，先給他一份模擬的分數結果，確保程式不會死當
            reportResult = {
                date: dateStr,
                positive_summary: "多數討論集中於肯定其高情商溝通技巧，給予強烈正面迴響。",
                negative_summary: "部分聲音認為觀點過於理想化，存在微小爭議。",
                overall_trend: "整體話題圍繞著他的著作與溝通心法，多數民眾表達認同，風向為正。",
                score: 75,
                source_data_count: testData.length
            };
        } else {
            console.log("🤖 正在呼叫 OpenAI GPT 引擎進行深度語意運算...");
            const openai = new OpenAI({ apiKey: apiKey });
            
            // 呼叫 OpenAI 大語言模型
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "你是一個回傳純 JSON 格式的輿情分析專家。" },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
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
    console.log(`👍 正面大意: ${reportResult.positive_summary}`);
    console.log(`👎 負面警示: ${reportResult.negative_summary}`);
    console.log("-----------------------------\n");
    
    return reportResult;
}

if (require.main === module) {
    analyzeData();
}

module.exports = { analyzeData };
