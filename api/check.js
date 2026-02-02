// מדד גאולה מקצועי - נתונים אמיתיים עם cache busting

async function safeExecute(fn, fallbackValue) {
    try {
        return await fn();
    } catch (error) {
        console.error("Error:", error.message);
        return fallbackValue;
    }
}

function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const now = new Date();
        const timestamp = now.getTime();

        // בדיקת שבת
        const dayOfWeek = now.getDay();
        const currentHour = now.getHours();
        
        if (dayOfWeek === 6 || (dayOfWeek === 5 && currentHour >= 15)) {
            return res.status(200).json({
                totalScore: 0,
                status: dayOfWeek === 6 ? "שבת שלום" : "ערב שבת",
                timestamp: now.toLocaleString('he-IL'),
                metrics: {
                    poverty: { score: 0, details: {}, summary: "שבת שלום" },
                    chutzpah: { score: 0, details: {}, summary: "שבת שלום" },
                    wisdomDecay: { score: 0, details: {}, summary: "שבת שלום" },
                    distraction: { score: 0, details: {}, summary: "שבת שלום" }
                }
            });
        }

        // 1. מדד כלכלה מקצועי
        const povertyData = await safeExecute(async () => {
            // S&P 500
            const sp500Res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1mo&_=${timestamp}`);
            const sp500Data = await sp500Res.json();
            const sp500Result = sp500Data.chart.result[0];
            const sp500Price = sp500Result.meta.regularMarketPrice;
            const sp500Prev = sp500Result.meta.previousClose;
            const sp500Change = ((sp500Price - sp500Prev) / sp500Prev) * 100;
            const sp500Closes = sp500Result.indicators.quote[0].close.filter(p => p !== null);
            const sp500MonthAvg = calculateAverage(sp500Closes);
            const sp500VsMonthAvg = ((sp500Price - sp500MonthAvg) / sp500MonthAvg) * 100;
            
            // דולר-שקל
            const ilsRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/ILS%3DX?interval=1d&range=1mo&_=${timestamp}`);
            const ilsData = await ilsRes.json();
            const ilsResult = ilsData.chart.result[0];
            const ilsPrice = ilsResult.meta.regularMarketPrice;
            const ilsCloses = ilsResult.indicators.quote[0].close.filter(p => p !== null);
            const ilsMonthAvg = calculateAverage(ilsCloses);
            const ilsVsAvg = ((ilsPrice - ilsMonthAvg) / ilsMonthAvg) * 100;
            
            // ביטקוין
            const btcRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1mo&_=${timestamp}`);
            const btcData = await btcRes.json();
            const btcResult = btcData.chart.result[0];
            const btcPrice = btcResult.meta.regularMarketPrice;
            const btcCloses = btcResult.indicators.quote[0].close.filter(p => p !== null);
            const btcMonthAvg = calculateAverage(btcCloses);
            const btcVsAvg = ((btcPrice - btcMonthAvg) / btcMonthAvg) * 100;
            
            // זהב
            const goldRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1mo&_=${timestamp}`);
            const goldData = await goldRes.json();
            const goldResult = goldData.chart.result[0];
            const goldPrice = goldResult.meta.regularMarketPrice;
            const goldCloses = goldResult.indicators.quote[0].close.filter(p => p !== null);
            const goldMonthAvg = calculateAverage(goldCloses);
            const goldVsAvg = ((goldPrice - goldMonthAvg) / goldMonthAvg) * 100;
            
            // כסף
            const silverRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/SI%3DF?interval=1d&range=1mo&_=${timestamp}`);
            const silverData = await silverRes.json();
            const silverResult = silverData.chart.result[0];
            const silverPrice = silverResult.meta.regularMarketPrice;
            const silverCloses = silverResult.indicators.quote[0].close.filter(p => p !== null);
            const silverMonthAvg = calculateAverage(silverCloses);
            const silverVsAvg = ((silverPrice - silverMonthAvg) / silverMonthAvg) * 100;
            
            // TA-35
            const ta35Res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/%5ETA35.TA?interval=1d&range=1mo&_=${timestamp}`);
            const ta35Data = await ta35Res.json();
            const ta35Result = ta35Data.chart.result[0];
            const ta35Price = ta35Result.meta.regularMarketPrice;
            const ta35Closes = ta35Result.indicators.quote[0].close.filter(p => p !== null);
            const ta35MonthAvg = calculateAverage(ta35Closes);
            const ta35VsAvg = ((ta35Price - ta35MonthAvg) / ta35MonthAvg) * 100;
            
            // חובות
            const debtNewsRes = await fetch(`https://news.google.com/rss/search?q=חובות+OR+מצוקה+כלכלית+OR+פשיטת+רגל&hl=he&gl=IL&ceid=IL:he&_=${timestamp}`);
            const debtNewsText = await debtNewsRes.text();
            const debtKeywords = ['חובות', 'חוב', 'מצוקה', 'פשיטת רגל', 'משכנתא', 'הלוואה'];
            let debtCount = 0;
            debtKeywords.forEach(keyword => {
                const matches = debtNewsText.match(new RegExp(keyword, 'gi'));
                if (matches) debtCount += matches.length;
            });
            
            // חישוב ציון
            let score = 0;
            const indicators = [];
            
            if (sp500VsMonthAvg < -5) { score += 8; indicators.push("S&P ↓5%+ מממוצע"); }
            else if (sp500VsMonthAvg < -3) { score += 5; indicators.push("S&P ↓3%+"); }
            else if (sp500VsMonthAvg < -1.5) { score += 2; indicators.push("S&P ↓קל"); }
            
            if (ilsVsAvg > 4) { score += 7; indicators.push("$ חזק 4%+"); }
            else if (ilsVsAvg > 2.5) { score += 4; indicators.push("$ חזק 2.5%+"); }
            else if (ilsVsAvg > 1.5) { score += 2; indicators.push("$ מתחזק"); }
            
            if (btcVsAvg > 15) { score += 5; indicators.push("BTC ↑15%+ (בריחה)"); }
            else if (btcVsAvg < -15) { score += 3; indicators.push("BTC ↓15%+"); }
            
            if (goldVsAvg > 5) { score += 4; indicators.push("זהב ↑5%+"); }
            else if (goldVsAvg > 3) { score += 2; indicators.push("זהב עולה"); }
            
            if (ta35VsAvg < -4) { score += 6; indicators.push("TA-35 ↓4%+"); }
            else if (ta35VsAvg < -2) { score += 3; indicators.push("TA-35 ↓"); }
            
            if (debtCount > 30) { score += 5; indicators.push("חובות חריג"); }
            else if (debtCount > 20) { score += 2; indicators.push("חובות מוגבר"); }
            
            return {
                score: Math.min(score, 25),
                summary: indicators.length > 0 ? indicators.join(" | ") : "יציבות",
                details: {
                    sp500: { price: sp500Price.toFixed(2), vsMonth: sp500VsMonthAvg.toFixed(2) + "%", daily: sp500Change.toFixed(2) + "%" },
                    usdIls: { price: ilsPrice.toFixed(3), vsMonth: ilsVsAvg.toFixed(2) + "%" },
                    bitcoin: { price: btcPrice.toFixed(0), vsMonth: btcVsAvg.toFixed(2) + "%" },
                    gold: { price: goldPrice.toFixed(2), vsMonth: goldVsAvg.toFixed(2) + "%" },
                    silver: { price: silverPrice.toFixed(2), vsMonth: silverVsAvg.toFixed(2) + "%" },
                    ta35: { price: ta35Price.toFixed(2), vsMonth: ta35VsAvg.toFixed(2) + "%" },
                    debtArticles: debtCount,
                    indicators
                },
                quote: "עד שתכלה פרוטה מן הכיס (סנהדרין צז)"
            };
        }, { score: 0, summary: "שגיאה", details: {}, quote: "עד שתכלה פרוטה מן הכיס" });

        // 2. חוצפה
        const chutzpahData = await safeExecute(async () => {
            const violenceRes = await fetch(`https://news.google.com/rss/search?q=אלימות+OR+שוד+OR+פשע+OR+תקיפה+OR+גניבה&hl=he&gl=IL&ceid=IL:he&_=${timestamp}`);
            const violenceText = await violenceRes.text();
            
            const keywords = ['אלימות', 'תקיפה', 'שוד', 'גניבה', 'פריצה', 'רצח', 'פצוע', 'נעצר', 'פשע', 'דקירה', 'ירי'];
            let count = 0;
            keywords.forEach(keyword => {
                const matches = violenceText.match(new RegExp(keyword, 'gi'));
                if (matches) count += matches.length;
            });
            
            const avg = 20;
            const pct = (count / avg) * 100;
            
            let score = 0, status = "";
            if (pct > 180) { score = 25; status = "חריג מאוד"; }
            else if (pct > 140) { score = 18; status = "חריג"; }
            else if (pct > 115) { score = 12; status = "מוגבר"; }
            else if (pct > 100) { score = 6; status = "מעל ממוצע"; }
            else if (pct > 85) { score = 3; status = "כמעט ממוצע"; }
            else { status = "מתחת ממוצע"; }
            
            return {
                score,
                summary: status,
                details: { current: count, average: avg, percent: pct.toFixed(1) + "%" },
                quote: "חוצפה יסגא (סנהדרין צז)"
            };
        }, { score: 0, summary: "שגיאה", details: {}, quote: "חוצפה יסגא" });

        // 3. חכמת חכמים תסרח - כל כתבה = נקודה
        const wisdomDecayData = await safeExecute(async () => {
            const charediRes = await fetch(`https://news.google.com/rss/search?q=חרדים+ביקורת+OR+חרדים+מחאה+OR+חרדים+סכסוך&hl=he&gl=IL&ceid=IL:he&_=${timestamp}`);
            const charediText = await charediRes.text();
            
            const keywords = ['ביקורת', 'מחאה', 'סכסוך', 'מתיחות', 'קיטוב', 'עימות', 'משבר', 'פגיעה', 'שנאה'];
            let count = 0;
            keywords.forEach(keyword => {
                const regex = new RegExp('חרדים.*' + keyword + '|' + keyword + '.*חרדים', 'gi');
                const matches = charediText.match(regex);
                if (matches) count += matches.length;
            });
            
            const score = Math.min(count, 25);
            let status = "";
            if (score >= 20) status = "ביקורת חריפה ביותר";
            else if (score >= 15) status = "ביקורת חריפה";
            else if (score >= 10) status = "ביקורת משמעותית";
            else if (score >= 5) status = "ביקורת קלה";
            else status = "אקלים חיובי";
            
            return {
                score,
                summary: status,
                details: { articles: count, formula: "כל כתבה = 1 נקודה (מקס 25)" },
                quote: "חכמת חכמים תסרח (סנהדרין צז)"
            };
        }, { score: 0, summary: "שגיאה", details: {}, quote: "חכמת חכמים תסרח" });

        // 4. היסח הדעת
        const distractionData = await safeExecute(async () => {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
            
            const wikiRes = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/he.wikipedia/all-access/all-agents/משיח/daily/${dateStr}/${dateStr}?_=${timestamp}`);
            const wikiData = await wikiRes.json();
            const wikiViews = wikiData.items?.[0]?.views || 80;
            
            const newsRes = await fetch(`https://news.google.com/rss/search?q=משיח+OR+גאולה&hl=he&gl=IL&ceid=IL:he&_=${timestamp}`);
            const newsText = await newsRes.text();
            const mentions = (newsText.match(/משיח/gi) || []).length;
            
            const total = wikiViews + mentions;
            const avg = 90;
            const pct = (total / avg) * 100;
            
            let score = 0, status = "";
            if (pct < 30) { score = 25; status = "היסח דעת מוחלט"; }
            else if (pct < 50) { score = 18; status = "היסח דעת חמור"; }
            else if (pct < 70) { score = 12; status = "היסח דעת משמעותי"; }
            else if (pct < 90) { score = 6; status = "עניין נמוך"; }
            else if (pct < 110) { score = 3; status = "כמעט ממוצע"; }
            else { status = "עניין מוגבר"; }
            
            return {
                score,
                summary: status,
                details: { wiki: wikiViews, news: mentions, total, average: avg, percent: pct.toFixed(1) + "%" },
                quote: "אין בן דוד בא אלא בהיסח הדעת (סנהדרין צז)"
            };
        }, { score: 0, summary: "שגיאה", details: {}, quote: "אין בן דוד בא אלא בהיסח הדעת" });

        const totalScore = povertyData.score + chutzpahData.score + wisdomDecayData.score + distractionData.score;
        const percentScore = Math.min((totalScore / 100) * 100, 99.9);

        res.status(200).json({
            totalScore: Math.round(percentScore),
            timestamp: now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false }),
            nextUpdate: new Date(now.getTime() + 10 * 60 * 1000).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false }),
            rawScore: totalScore,
            maxScore: 100,
            fetchId: timestamp,
            metrics: {
                poverty: povertyData,
                chutzpah: chutzpahData,
                wisdomDecay: wisdomDecayData,
                distraction: distractionData
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(200).json({
            totalScore: 15,
            timestamp: new Date().toLocaleString('he-IL'),
            error: error.message,
            metrics: {
                poverty: { score: 4, summary: "שגיאה", details: {} },
                chutzpah: { score: 4, summary: "שגיאה", details: {} },
                wisdomDecay: { score: 4, summary: "שגיאה", details: {} },
                distraction: { score: 3, summary: "שגיאה", details: {} }
            }
        });
    }
}
