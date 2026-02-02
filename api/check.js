// ============================================
// מדד הגאולה - API מקצועי ועובד
// ============================================

// פונקציות עזר
function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const filtered = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// ============================================
// מדד 1: כלכלה - "עד שתכלה פרוטה מן הכיס"
// ============================================
async function getEconomyMetric() {
    try {
        const results = {
            sp500: null,
            usdils: null,
            bitcoin: null,
            gold: null,
            ta35: null
        };

        // S&P 500
        try {
            const sp500Res = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1mo');
            const sp500Data = await sp500Res.json();
            const sp500Chart = sp500Data.chart.result[0];
            const currentPrice = sp500Chart.meta.regularMarketPrice;
            const closes = sp500Chart.indicators.quote[0].close.filter(x => x !== null);
            const monthAvg = calculateAverage(closes);
            results.sp500 = {
                current: currentPrice,
                monthAvg: monthAvg,
                changePercent: ((currentPrice - monthAvg) / monthAvg) * 100
            };
        } catch (e) {
            console.error('S&P 500 error:', e.message);
        }

        // דולר-שקל
        try {
            const ilsRes = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/ILS%3DX?interval=1d&range=1mo');
            const ilsData = await ilsRes.json();
            const ilsChart = ilsData.chart.result[0];
            const currentPrice = ilsChart.meta.regularMarketPrice;
            const closes = ilsChart.indicators.quote[0].close.filter(x => x !== null);
            const monthAvg = calculateAverage(closes);
            results.usdils = {
                current: currentPrice,
                monthAvg: monthAvg,
                changePercent: ((currentPrice - monthAvg) / monthAvg) * 100
            };
        } catch (e) {
            console.error('USD/ILS error:', e.message);
        }

        // ביטקוין
        try {
            const btcRes = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1mo');
            const btcData = await btcRes.json();
            const btcChart = btcData.chart.result[0];
            const currentPrice = btcChart.meta.regularMarketPrice;
            const closes = btcChart.indicators.quote[0].close.filter(x => x !== null);
            const monthAvg = calculateAverage(closes);
            results.bitcoin = {
                current: currentPrice,
                monthAvg: monthAvg,
                changePercent: ((currentPrice - monthAvg) / monthAvg) * 100
            };
        } catch (e) {
            console.error('Bitcoin error:', e.message);
        }

        // זהב
        try {
            const goldRes = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1mo');
            const goldData = await goldRes.json();
            const goldChart = goldData.chart.result[0];
            const currentPrice = goldChart.meta.regularMarketPrice;
            const closes = goldChart.indicators.quote[0].close.filter(x => x !== null);
            const monthAvg = calculateAverage(closes);
            results.gold = {
                current: currentPrice,
                monthAvg: monthAvg,
                changePercent: ((currentPrice - monthAvg) / monthAvg) * 100
            };
        } catch (e) {
            console.error('Gold error:', e.message);
        }

        // TA-35
        try {
            const ta35Res = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/%5ETA35.TA?interval=1d&range=1mo');
            const ta35Data = await ta35Res.json();
            const ta35Chart = ta35Data.chart.result[0];
            const currentPrice = ta35Chart.meta.regularMarketPrice;
            const closes = ta35Chart.indicators.quote[0].close.filter(x => x !== null);
            const monthAvg = calculateAverage(closes);
            results.ta35 = {
                current: currentPrice,
                monthAvg: monthAvg,
                changePercent: ((currentPrice - monthAvg) / monthAvg) * 100
            };
        } catch (e) {
            console.error('TA-35 error:', e.message);
        }

        // חישוב ציון
        let score = 0;
        const indicators = [];

        if (results.sp500 && results.sp500.changePercent < -4) {
            score += 6;
            indicators.push(`S&P ${results.sp500.changePercent.toFixed(1)}%`);
        } else if (results.sp500 && results.sp500.changePercent < -2) {
            score += 3;
            indicators.push(`S&P ${results.sp500.changePercent.toFixed(1)}%`);
        }

        if (results.usdils && results.usdils.changePercent > 3) {
            score += 5;
            indicators.push(`$ חזק ${results.usdils.changePercent.toFixed(1)}%`);
        } else if (results.usdils && results.usdils.changePercent > 1.5) {
            score += 2;
            indicators.push(`$ עולה ${results.usdils.changePercent.toFixed(1)}%`);
        }

        if (results.bitcoin && results.bitcoin.changePercent > 10) {
            score += 4;
            indicators.push(`BTC ${results.bitcoin.changePercent.toFixed(1)}%`);
        }

        if (results.gold && results.gold.changePercent > 4) {
            score += 3;
            indicators.push(`זהב ${results.gold.changePercent.toFixed(1)}%`);
        }

        if (results.ta35 && results.ta35.changePercent < -3) {
            score += 5;
            indicators.push(`TA-35 ${results.ta35.changePercent.toFixed(1)}%`);
        }

        return {
            score: Math.min(score, 25),
            summary: indicators.length > 0 ? indicators.join(' | ') : 'יציבות כלכלית',
            details: results,
            quote: 'עד שתכלה פרוטה מן הכיס'
        };

    } catch (error) {
        console.error('Economy metric error:', error);
        return {
            score: 0,
            summary: 'שגיאה בטעינת נתונים',
            details: {},
            quote: 'עד שתכלה פרוטה מן הכיס'
        };
    }
}

// ============================================
// מדד 2: חוצפה - "חוצפה יסגא"
// ============================================
async function getChutzpahMetric() {
    try {
        const url = 'https://news.google.com/rss/search?q=אלימות+OR+שוד+OR+פשע+OR+תקיפה&hl=he&gl=IL&ceid=IL:he';
        const response = await fetchWithTimeout(url);
        const text = await response.text();

        const keywords = ['אלימות', 'תקיפה', 'שוד', 'גניבה', 'רצח', 'פשע', 'נעצר'];
        let count = 0;

        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) count += matches.length;
        });

        // ממוצע: 20 דיווחים
        const average = 20;
        const percent = (count / average) * 100;

        let score = 0;
        let status = '';

        if (percent > 150) {
            score = 20;
            status = 'רמה חריגה';
        } else if (percent > 120) {
            score = 12;
            status = 'רמה גבוהה';
        } else if (percent > 100) {
            score = 6;
            status = 'מעל ממוצע';
        } else {
            status = 'רמה רגילה';
        }

        return {
            score: Math.min(score, 25),
            summary: status,
            details: {
                count: count,
                average: average,
                percent: percent.toFixed(1) + '%'
            },
            quote: 'חוצפה יסגא'
        };

    } catch (error) {
        console.error('Chutzpah metric error:', error);
        return {
            score: 0,
            summary: 'שגיאה',
            details: {},
            quote: 'חוצפה יסגא'
        };
    }
}

// ============================================
// מדד 3: חכמת חכמים תסרח
// ============================================
async function getWisdomDecayMetric() {
    try {
        const url = 'https://news.google.com/rss/search?q=חרדים+ביקורת+OR+חרדים+מחאה+OR+חרדים+קיטוב&hl=he&gl=IL&ceid=IL:he';
        const response = await fetchWithTimeout(url);
        const text = await response.text();

        const keywords = ['ביקורת', 'מחאה', 'סכסוך', 'קיטוב', 'עימות', 'משבר'];
        let count = 0;

        keywords.forEach(keyword => {
            const regex = new RegExp('חרדים.*?' + keyword + '|' + keyword + '.*?חרדים', 'gi');
            const matches = text.match(regex);
            if (matches) count += matches.length;
        });

        // כל כתבה = 1 נקודה, עד 25
        const score = Math.min(count, 25);

        let status = '';
        if (score >= 18) status = 'ביקורת חריפה מאוד';
        else if (score >= 12) status = 'ביקורת חריפה';
        else if (score >= 7) status = 'ביקורת משמעותית';
        else if (score >= 3) status = 'ביקורת קלה';
        else status = 'שקט יחסי';

        return {
            score: score,
            summary: status,
            details: {
                articles: count,
                formula: 'כל כתבה = 1 נקודה'
            },
            quote: 'חכמת חכמים תסרח'
        };

    } catch (error) {
        console.error('Wisdom decay metric error:', error);
        return {
            score: 0,
            summary: 'שגיאה',
            details: {},
            quote: 'חכמת חכמים תסרח'
        };
    }
}

// ============================================
// מדד 4: היסח הדעת
// ============================================
async function getDistractionMetric() {
    try {
        // Wikipedia
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

        let wikiViews = 80; // ברירת מחדל
        try {
            const wikiUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/he.wikipedia/all-access/all-agents/משיח/daily/${dateStr}/${dateStr}`;
            const wikiRes = await fetchWithTimeout(wikiUrl);
            const wikiData = await wikiRes.json();
            if (wikiData.items && wikiData.items[0]) {
                wikiViews = wikiData.items[0].views;
            }
        } catch (e) {
            console.error('Wiki error:', e.message);
        }

        // חדשות
        let newsMentions = 10; // ברירת מחדל
        try {
            const newsUrl = 'https://news.google.com/rss/search?q=משיח+OR+גאולה&hl=he&gl=IL&ceid=IL:he';
            const newsRes = await fetchWithTimeout(newsUrl);
            const newsText = await newsRes.text();
            const matches = newsText.match(/משיח/gi);
            newsMentions = matches ? matches.length : 0;
        } catch (e) {
            console.error('News error:', e.message);
        }

        const total = wikiViews + newsMentions;
        const average = 90;
        const percent = (total / average) * 100;

        let score = 0;
        let status = '';

        // ככל שפחות עניין = יותר היסח דעת = ציון גבוה
        if (percent < 40) {
            score = 20;
            status = 'היסח דעת מוחלט';
        } else if (percent < 60) {
            score = 14;
            status = 'היסח דעת חמור';
        } else if (percent < 80) {
            score = 8;
            status = 'עניין נמוך';
        } else if (percent < 100) {
            score = 4;
            status = 'כמעט ממוצע';
        } else {
            status = 'עניין רגיל';
        }

        return {
            score: Math.min(score, 25),
            summary: status,
            details: {
                wiki: wikiViews,
                news: newsMentions,
                total: total,
                average: average,
                percent: percent.toFixed(1) + '%'
            },
            quote: 'אין בן דוד בא אלא בהיסח הדעת'
        };

    } catch (error) {
        console.error('Distraction metric error:', error);
        return {
            score: 0,
            summary: 'שגיאה',
            details: {},
            quote: 'אין בן דוד בא אלא בהיסח הדעת'
        };
    }
}

// ============================================
// Main Handler
// ============================================
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const now = new Date();

        // בדיקת שבת
        const dayOfWeek = now.getDay();
        const hour = now.getHours();

        if (dayOfWeek === 6 || (dayOfWeek === 5 && hour >= 15)) {
            return res.status(200).json({
                totalScore: 0,
                status: 'שבת שלום',
                timestamp: now.toISOString(),
                metrics: {
                    poverty: { score: 0, summary: 'שבת שלום', details: {} },
                    chutzpah: { score: 0, summary: 'שבת שלום', details: {} },
                    wisdomDecay: { score: 0, summary: 'שבת שלום', details: {} },
                    distraction: { score: 0, summary: 'שבת שלום', details: {} }
                }
            });
        }

        // שליפת כל המדדים במקביל
        console.log('Fetching all metrics...');
        const [poverty, chutzpah, wisdomDecay, distraction] = await Promise.all([
            getEconomyMetric(),
            getChutzpahMetric(),
            getWisdomDecayMetric(),
            getDistractionMetric()
        ]);

        const totalScore = poverty.score + chutzpah.score + wisdomDecay.score + distraction.score;
        const percentScore = Math.min((totalScore / 100) * 100, 99.9);

        console.log('Scores:', {
            poverty: poverty.score,
            chutzpah: chutzpah.score,
            wisdomDecay: wisdomDecay.score,
            distraction: distraction.score,
            total: totalScore,
            percent: percentScore
        });

        return res.status(200).json({
            totalScore: Math.round(percentScore),
            timestamp: now.toISOString(),
            nextUpdate: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
            metrics: {
                poverty: poverty,
                chutzpah: chutzpah,
                wisdomDecay: wisdomDecay,
                distraction: distraction
            }
        });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            error: 'שגיאה בשרת',
            message: error.message
        });
    }
}
