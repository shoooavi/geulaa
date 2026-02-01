// מדד גאולה מתוקן - 4 מדדים בלבד, חישוב ממוצע נכון, תמיכה בשבת וחגים

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

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        // בדיקת שבת וחגים דרך Hebcal API
        const hebcalCheck = await safeExecute(async () => {
            const hebcalRes = await fetch(
                `https://www.hebcal.com/shabbat?cfg=json&geonameid=281184&M=on&gy=${yyyy}&gm=${mm}&gd=${dd}`
            );
            const hebcalData = await hebcalRes.json();
            
            const dayOfWeek = now.getDay();
            const currentHour = now.getHours();
            
            // בדיקה אם יש נרות שבת/חג היום או מחר
            const candleLightingToday = hebcalData.items.find(item => 
                item.category === 'candles' && 
                new Date(item.date).toDateString() === now.toDateString()
            );
            
            const havdalahToday = hebcalData.items.find(item => 
                item.category === 'havdalah' && 
                new Date(item.date).toDateString() === now.toDateString()
            );
            
            const holidayToday = hebcalData.items.find(item => 
                (item.category === 'holiday' || item.yomtov === true) && 
                new Date(item.date).toDateString() === now.toDateString()
            );
            
            // בדיקה: שבת או ערב שבת/חג
            let isShabbatOrHoliday = false;
            let message = "";
            
            if (dayOfWeek === 6) { // שבת
                isShabbatOrHoliday = true;
                message = "שבת שלום";
            } else if (dayOfWeek === 5 && currentHour >= 15) { // ערב שבת
                isShabbatOrHoliday = true;
                message = "שבת שלום - ערב שבת";
            } else if (holidayToday) { // חג
                isShabbatOrHoliday = true;
                message = `חג שמח - ${holidayToday.title}`;
            } else if (candleLightingToday && currentHour >= 15) { // ערב חג
                isShabbatOrHoliday = true;
                message = `ערב חג - ${candleLightingToday.title}`;
            }
            
            return { isShabbatOrHoliday, message };
        }, { isShabbatOrHoliday: false, message: "" });

        if (hebcalCheck.isShabbatOrHoliday) {
            return res.status(200).json({
                totalScore: 0,
                status: hebcalCheck.message,
                timestamp: now.toLocaleString('he-IL'),
                metrics: {
                    poverty: { score: 0, details: {}, summary: hebcalCheck.message },
                    chutzpah: { score: 0, details: {}, summary: hebcalCheck.message },
                    wisdomDecay: { score: 0, details: {}, summary: hebcalCheck.message },
                    distraction: { score: 0, details: {}, summary: hebcalCheck.message }
                }
            });
        }

        // 1. "עד שתכלה פרוטה מן הכיס" - מדד כלכלה
        const povertyData = await safeExecute(async () => {
            const sp500Res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1mo');
            const sp500Data = await sp500Res.json();
            const sp500Result = sp500Data.chart.result[0];
            const sp500CurrentPrice = sp500Result.meta.regularMarketPrice;
            const sp500PreviousClose = sp500Result.meta.previousClose;
            const sp500Change = ((sp500CurrentPrice - sp500PreviousClose) / sp500PreviousClose) * 100;
            
            const ilsRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/ILS%3DX?interval=1d&range=1mo');
            const ilsData = await ilsRes.json();
            const ilsResult = ilsData.chart.result[0];
            const ilsCurrentPrice = ilsResult.meta.regularMarketPrice;
            const ilsClosePrices = ilsResult.indicators.quote[0].close.filter(p => p !== null);
            const ilsMonthlyAvg = calculateAverage(ilsClosePrices);
            const ilsVsAvg = ((ilsCurrentPrice - ilsMonthlyAvg) / ilsMonthlyAvg) * 100;
            
            const inflationEstimate = Math.abs(sp500Change) > 2 ? "גבוהה" : sp500Change < 0 ? "בינונית" : "נמוכה";
            
            const debtNewsRes = await fetch('https://news.google.com/rss/search?q=חובות+OR+מצוקה+כלכלית+OR+פשיטת+רגל&hl=he&gl=IL&ceid=IL:he');
            const debtNewsText = await debtNewsRes.text();
            const debtKeywords = ['חובות', 'חוב', 'מצוקה', 'פשיטת רגל', 'משכנתא'];
            let debtArticlesCount = 0;
            debtKeywords.forEach(keyword => {
                const regex = new RegExp(keyword, 'gi');
                const matches = debtNewsText.match(regex);
                if (matches) debtArticlesCount += matches.length;
            });
            
            // חישוב ציון - רק חריגות משמעותיות
            let score = 0;
            const indicators = [];
            
            // ממוצע = 0 ציון, רק חריגות מקבלות ציון
            if (sp500Change < -3) { // ירידה חריגה מאוד
                score += 20;
                indicators.push("משבר שוקים חמור");
            } else if (sp500Change < -2) { // ירידה חריגה
                score += 12;
                indicators.push("ירידה חדה בשוק");
            } else if (sp500Change < -1) {
                score += 5;
                indicators.push("ירידה משמעותית");
            }
            
            // דולר-שקל - רק חריגה מהממוצע החודשי
            if (ilsVsAvg > 5) { // חריגה של 5% מהממוצע
                score += 15;
                indicators.push("שקל חלש חריג");
            } else if (ilsVsAvg > 3) {
                score += 8;
                indicators.push("שקל חלש");
            } else if (ilsVsAvg > 1.5) {
                score += 3;
                indicators.push("שקל נחלש מעט");
            }
            
            // חובות - רק אם יש הרבה מאוד
            const avgDebtArticles = 12; // ממוצע
            if (debtArticlesCount > avgDebtArticles * 2) { // פי 2 מהממוצע
                score += 12;
                indicators.push("דיווחים חריגים על חובות");
            } else if (debtArticlesCount > avgDebtArticles * 1.5) {
                score += 5;
                indicators.push("דיווחים מוגברים על חובות");
            }
            
            return {
                score: Math.min(score, 25),
                summary: indicators.length > 0 ? indicators.join(", ") : "יציבות כלכלית",
                details: {
                    sp500Change: sp500Change.toFixed(2) + "%",
                    sp500Price: sp500CurrentPrice.toFixed(2),
                    usdIlsCurrent: ilsCurrentPrice.toFixed(3),
                    usdIlsMonthlyAvg: ilsMonthlyAvg.toFixed(3),
                    usdIlsVsAvg: ilsVsAvg.toFixed(2) + "%",
                    inflationEstimate,
                    debtArticlesCount,
                    debtAverage: avgDebtArticles,
                    indicators
                },
                quote: "עד שתכלה פרוטה מן הכיס (סנהדרין צז ע\"א)"
            };
        }, { score: 0, summary: "אין נתונים", details: {}, quote: "עד שתכלה פרוטה מן הכיס" });

        // 2. "חוצפה יסגא" - אלימות ופשע
        const chutzpahData = await safeExecute(async () => {
            const violenceRes = await fetch('https://news.google.com/rss/search?q=אלימות+OR+שוד+OR+פשע+OR+תקיפה+OR+גניבה&hl=he&gl=IL&ceid=IL:he');
            const violenceText = await violenceRes.text();
            
            const violenceKeywords = ['אלימות', 'תקיפה', 'שוד', 'גניבה', 'פריצה', 'רצח', 'פצוע', 'נעצר', 'פשע'];
            
            let currentCount = 0;
            violenceKeywords.forEach(keyword => {
                const regex = new RegExp(keyword, 'gi');
                const matches = violenceText.match(regex);
                if (matches) currentCount += matches.length;
            });
            
            // ממוצע היסטורי - 18 דיווחים ב-3 ימים
            const averageCount = 18;
            const percentVsAverage = (currentCount / averageCount) * 100;
            
            // ציון רק לחריגות
            let score = 0;
            let status = "";
            
            if (percentVsAverage > 200) { // פי 2 מהממוצע
                score = 25;
                status = "רמת אלימות חריגה ביותר";
            } else if (percentVsAverage > 150) {
                score = 18;
                status = "רמת אלימות חריגה";
            } else if (percentVsAverage > 120) {
                score = 10;
                status = "רמת אלימות מוגברת";
            } else if (percentVsAverage > 100) {
                score = 5;
                status = "מעט מעל הממוצע";
            } else {
                status = "רמה רגילה";
            }
            
            return {
                score,
                summary: status,
                details: {
                    currentReports: currentCount,
                    averageReports: averageCount,
                    percentVsAverage: percentVsAverage.toFixed(1) + "%",
                    interpretation: percentVsAverage > 100 ? "מעל ממוצע" : "מתחת לממוצע"
                },
                quote: "חוצפה יסגא (סנהדרין צז ע\"א)"
            };
        }, { score: 0, summary: "אין נתונים", details: {}, quote: "חוצפה יסגא" });

        // 3. "חכמת חכמים תסרח" - כתבות שליליות על חרדים
        const wisdomDecayData = await safeExecute(async () => {
            const charediNewsRes = await fetch('https://news.google.com/rss/search?q=חרדים+ביקורת+OR+חרדים+מחאה+OR+חרדים+סכסוך&hl=he&gl=IL&ceid=IL:he');
            const charediNewsText = await charediNewsRes.text();
            
            const negativeKeywords = ['ביקורת', 'מחאה', 'סכסוך', 'מתיחות', 'קיטוב', 'עימות', 'משבר'];
            
            let negativeArticlesCount = 0;
            negativeKeywords.forEach(keyword => {
                const regex = new RegExp('חרדים.*' + keyword + '|' + keyword + '.*חרדים', 'gi');
                const matches = charediNewsText.match(regex);
                if (matches) negativeArticlesCount += matches.length;
            });
            
            // ממוצע שבועי - 10 כתבות
            const weeklyAverage = 10;
            const percentVsAverage = (negativeArticlesCount / weeklyAverage) * 100;
            
            let score = 0;
            let status = "";
            
            if (percentVsAverage > 250) { // פי 2.5 מהממוצע
                score = 25;
                status = "ביקורת חריפה חריגה";
            } else if (percentVsAverage > 180) {
                score = 18;
                status = "ביקורת חריפה מאוד";
            } else if (percentVsAverage > 130) {
                score = 10;
                status = "ביקורת משמעותית";
            } else if (percentVsAverage > 100) {
                score = 4;
                status = "מעט מעל הממוצע";
            } else {
                status = "אקלים רגיל";
            }
            
            return {
                score,
                summary: status,
                details: {
                    negativeArticlesCount,
                    weeklyAverage,
                    percentVsAverage: percentVsAverage.toFixed(1) + "%",
                    interpretation: percentVsAverage > 100 ? "מעל ממוצע" : "מתחת לממוצע"
                },
                quote: "חכמת חכמים תסרח (סנהדרין צז ע\"א)"
            };
        }, { score: 0, summary: "אין נתונים", details: {}, quote: "חכמת חכמים תסרח" });

        // 4. "אין בן דוד בא אלא בהיסח הדעת" - עניין במשיח
        const distractionData = await safeExecute(async () => {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
            
            const wikiRes = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/he.wikipedia/all-access/all-agents/משיח/daily/${dateStr}/${dateStr}`);
            const wikiData = await wikiRes.json();
            const wikiViews = wikiData.items?.[0]?.views || 100;
            
            const mashiachNewsRes = await fetch('https://news.google.com/rss/search?q=משיח+OR+גאולה&hl=he&gl=IL&ceid=IL:he');
            const mashiachNewsText = await mashiachNewsRes.text();
            const mashiachMentions = (mashiachNewsText.match(/משיח/gi) || []).length;
            
            const totalCurrent = wikiViews + mashiachMentions;
            
            // ממוצע יומי - 90 (80 ויקי + 10 חדשות)
            const dailyAverage = 90;
            const percentVsAverage = (totalCurrent / dailyAverage) * 100;
            
            // ציון - ככל שפחות עניין, יותר היסח דעת
            let score = 0;
            let status = "";
            
            if (percentVsAverage < 40) { // 40% מהממוצע ומטה
                score = 25;
                status = "היסח דעת מוחלט";
            } else if (percentVsAverage < 60) {
                score = 18;
                status = "היסח דעת משמעותי";
            } else if (percentVsAverage < 80) {
                score = 10;
                status = "עניין נמוך";
            } else if (percentVsAverage < 100) {
                score = 4;
                status = "מעט מתחת לממוצע";
            } else {
                status = "עניין רגיל";
            }
            
            return {
                score,
                summary: status,
                details: {
                    wikiViews,
                    newsMentions: mashiachMentions,
                    total: totalCurrent,
                    dailyAverage,
                    percentVsAverage: percentVsAverage.toFixed(1) + "%",
                    interpretation: percentVsAverage < 100 ? "היסח דעת - מתחת לממוצע" : "מעל ממוצע"
                },
                quote: "אין בן דוד בא אלא בהיסח הדעת (סנהדרין צז ע\"א)"
            };
        }, { score: 0, summary: "אין נתונים", details: {}, quote: "אין בן דוד בא אלא בהיסח הדעת" });

        // חישוב ציון כולל
        const totalScore = povertyData.score + chutzpahData.score + wisdomDecayData.score + distractionData.score;
        
        // המרה לאחוזים - הציון המקסימלי הוא 100 (25*4)
        const percentScore = Math.min((totalScore / 100) * 100, 99.9);

        res.status(200).json({
            totalScore: Math.round(percentScore),
            timestamp: now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false }),
            nextUpdate: new Date(now.getTime() + 10 * 60 * 1000).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour12: false }),
            rawScore: totalScore, // ציון גולמי לדיבוג
            maxScore: 100,
            metrics: {
                poverty: povertyData,
                chutzpah: chutzpahData,
                wisdomDecay: wisdomDecayData,
                distraction: distractionData
            }
        });

    } catch (error) {
        console.error('Handler error:', error);
        res.status(200).json({
            totalScore: 25,
            timestamp: new Date().toLocaleString('he-IL'),
            error: "שגיאה זמנית",
            metrics: {
                poverty: { score: 6, summary: "נתונים זמניים", details: {} },
                chutzpah: { score: 6, summary: "נתונים זמניים", details: {} },
                wisdomDecay: { score: 6, summary: "נתונים זמניים", details: {} },
                distraction: { score: 7, summary: "נתונים זמניים", details: {} }
            }
        });
    }
}
