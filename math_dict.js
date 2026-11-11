/**
 * 高校数学公式辞書 (数I, 数A, 数II, 数B, 数III, 数C)
 * および 記号・構文変換用辞書定義
 */

const MATH_DICTIONARY = {
  // ==========================================
  // 1. 高校数学 定理・公式辞書（名称からLaTeXへ）
  // ==========================================
  namedFormulas: [
    // --- 数学I ---
    {
      category: "数学I: 数と式・2次関数",
      keywords: ["解の公式", "2次方程式の解の公式", "二次方程式の解の公式"],
      latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      description: "2次方程式 ax^2 + bx + c = 0 の解"
    },
    {
      category: "数学I: 数と式・2次関数",
      keywords: ["判別式", "2次方程式の判別式"],
      latex: "D = b^2 - 4ac",
      description: "実数解の個数を判別する式"
    },
    {
      category: "数学I: 数と式・2次関数",
      keywords: ["平方完成", "放物線の頂点"],
      latex: "y = a\\left(x + \\frac{b}{2a}\\right)^2 - \\frac{b^2 - 4ac}{4a}",
      description: "2次関数 y = ax^2 + bx + c の標準形"
    },
    {
      category: "数学I: 数と式・2次関数",
      keywords: ["展開公式3乗", "3乗の展開"],
      latex: "(a \\pm b)^3 = a^3 \\pm 3a^2b + 3ab^2 \\pm b^3",
      description: "3乗の展開公式（複号同順）"
    },
    {
      category: "数学I: 数と式・2次関数",
      keywords: ["因数分解3乗", "3乗の因数分解"],
      latex: "a^3 \\pm b^3 = (a \\pm b)(a^2 \\mp ab + b^2)",
      description: "3乗の和・差の因数分解"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["三角比の相互関係1", "sin^2+cos^2=1", "sin2+cos2=1"],
      latex: "\\sin^2 \\theta + \\cos^2 \\theta = 1",
      description: "三角比の基本相互関係"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["三角比の相互関係2", "tan=sin/cos"],
      latex: "\\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta}",
      description: "正接と正弦・余弦の関係"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["三角比の相互関係3", "1+tan^2=1/cos^2"],
      latex: "1 + \\tan^2 \\theta = \\frac{1}{\\cos^2 \\theta}",
      description: "正接と余弦の関係"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["正弦定理"],
      latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R",
      description: "三角形の外接円の半径 R と各辺・角の関係"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["余弦定理", "第2余弦定理"],
      latex: "a^2 = b^2 + c^2 - 2bc \\cos A",
      description: "3辺と1つの角の関係"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["三角形の面積公式", "三角比の面積"],
      latex: "S = \\frac{1}{2}bc \\sin A",
      description: "2辺とその間の角から求める三角形の面積"
    },
    {
      category: "数学I: 図形と計量（三角比）",
      keywords: ["ヘロンの公式"],
      latex: "S = \\sqrt{s(s-a)(s-b)(s-c)} \\quad \\left(s = \\frac{a+b+c}{2}\\right)",
      description: "3辺の長さから三角形の面積を求める公式"
    },
    {
      category: "数学I: データの分析",
      keywords: ["分散", "分散の公式"],
      latex: "s^2 = \\frac{1}{n} \\sum_{i=1}^n (x_i - \\bar{x})^2 = \\overline{x^2} - (\\bar{x})^2",
      description: "データの散らばり（2乗の平均 - 平均の2乗）"
    },
    {
      category: "数学I: データの分析",
      keywords: ["標準偏差"],
      latex: "s = \\sqrt{\\frac{1}{n} \\sum_{i=1}^n (x_i - \\bar{x})^2}",
      description: "分散の正の平方根"
    },
    {
      category: "数学I: データの分析",
      keywords: ["相関係数"],
      latex: "r = \\frac{s_{xy}}{s_x s_y} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2} \\sqrt{\\sum (y_i - \\bar{y})^2}}",
      description: "2変数間の線形相関の強さ"
    },

    // --- 数学A ---
    {
      category: "数学A: 場合の数・確率",
      keywords: ["順列", "順列の公式", "nPr"],
      latex: "{}_n\\mathrm{P}_r = \\frac{n!}{(n - r)!} = n(n-1)\\cdots(n-r+1)",
      description: "異なるn個からr個を取り出して並べる並べ方"
    },
    {
      category: "数学A: 場合の数・確率",
      keywords: ["組合せ", "組み合わせ", "組合せの公式", "nCr"],
      latex: "{}_n\\mathrm{C}_r = \\frac{{}_n\\mathrm{P}_r}{r!} = \\frac{n!}{r!(n - r)!}",
      description: "異なるn個からr個を取り出す選び方"
    },
    {
      category: "数学A: 場合の数・確率",
      keywords: ["重複組合せ", "重複組み合わせ", "nHr"],
      latex: "{}_n\\mathrm{H}_r = {}_{n+r-1}\\mathrm{C}_r",
      description: "異なるn種から重複を許してr個選ぶ選び方"
    },
    {
      category: "数学A: 場合の数・確率",
      keywords: ["条件付き確率"],
      latex: "P_A(B) = P(B \\mid A) = \\frac{P(A \\cap B)}{P(A)}",
      description: "事象Aが起きた条件の下でBが起きる確率"
    },
    {
      category: "数学A: 場合の数・確率",
      keywords: ["反復試行の確率"],
      latex: "P = {}_n\\mathrm{C}_r p^r (1 - p)^{n - r}",
      description: "確率pの試行をn回行うときr回成功する確率"
    },
    {
      category: "数学A: 図形の性質",
      keywords: ["チェバの定理"],
      latex: "\\frac{\\mathrm{BP}}{\\mathrm{PC}} \\cdot \\frac{\\mathrm{CQ}}{\\mathrm{QA}} \\cdot \\frac{\\mathrm{AR}}{\\mathrm{RB}} = 1",
      description: "三角形の頂点と対辺を結ぶ3直線が1点で交わるときの比"
    },
    {
      category: "数学A: 図形の性質",
      keywords: ["メネラウスの定理"],
      latex: "\\frac{\\mathrm{BP}}{\\mathrm{PC}} \\cdot \\frac{\\mathrm{CQ}}{\\mathrm{QA}} \\cdot \\frac{\\mathrm{AR}}{\\mathrm{RB}} = 1",
      description: "三角形の辺と直線が交わるときの線分比の関係"
    },
    {
      category: "数学A: 図形の性質",
      keywords: ["方べきの定理"],
      latex: "\\mathrm{PA} \\cdot \\mathrm{PB} = \\mathrm{PC} \\cdot \\mathrm{PD} = \\mathrm{PT}^2",
      description: "円と2直線の交点に関する積の一定定理"
    },
    {
      category: "数学A: 数学と人間の活動（整数）",
      keywords: ["ユークリッドの互除法", "ユークリッド互除法"],
      latex: "a = bq + r \\implies \\gcd(a, b) = \\gcd(b, r)",
      description: "2つの自然数の最大公約数を求めるアルゴリズム"
    },

    // --- 数学II ---
    {
      category: "数学II: 式と証明・複素数と方程式",
      keywords: ["二項定理"],
      latex: "(a + b)^n = \\sum_{k=0}^n {}_n\\mathrm{C}_k a^{n-k} b^k",
      description: "(a+b)^n の展開式"
    },
    {
      category: "数学II: 式と証明・複素数と方程式",
      keywords: ["解と係数の関係", "解と係数の関係2次"],
      latex: "\\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}",
      description: "2次方程式 ax^2 + bx + c = 0 の2解と係数"
    },
    {
      category: "数学II: 式と証明・複素数と方程式",
      keywords: ["解と係数の関係3次"],
      latex: "\\alpha + \\beta + \\gamma = -\\frac{b}{a}, \\quad \\alpha\\beta + \\beta\\gamma + \\gamma\\alpha = \\frac{c}{a}, \\quad \\alpha\\beta\\gamma = -\\frac{d}{a}",
      description: "3次方程式 ax^3 + bx^2 + cx + d = 0 の3解と係数"
    },
    {
      category: "数学II: 式と証明・複素数と方程式",
      keywords: ["相加相乗平均", "相加・相乗平均の大小関係", "相加平均と相乗平均"],
      latex: "\\frac{a + b}{2} \\ge \\sqrt{ab} \\quad (a > 0, b > 0)",
      description: "等号成立は a = b のとき"
    },
    {
      category: "数学II: 式と証明・複素数と方程式",
      keywords: ["コーシー・シュワルツの不等式", "コーシーシュワルツ"],
      latex: "(a^2 + b^2)(x^2 + y^2) \\ge (ax + by)^2",
      description: "実数ベクトル空間の内積とノルムに関する不等式"
    },
    {
      category: "数学II: 図形と方程式",
      keywords: ["内分点", "外分点", "内分公式"],
      latex: "x = \\frac{nx_1 + mx_2}{m + n}, \\quad y = \\frac{ny_1 + my_2}{m + n}",
      description: "線分ABを m:n に内分する点の座標"
    },
    {
      category: "数学II: 図形と方程式",
      keywords: ["点と直線の距離", "点と直線の距離の公式"],
      latex: "d = \\frac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}}",
      description: "点 (x0, y0) と直線 ax + by + c = 0 の距離"
    },
    {
      category: "数学II: 図形と方程式",
      keywords: ["円の方程式", "円の標準形"],
      latex: "(x - a)^2 + (y - b)^2 = r^2",
      description: "中心 (a, b), 半径 r の円の方程式"
    },
    {
      category: "数学II: 三角関数",
      keywords: ["加法定理", "三角関数の加法定理"],
      latex: "\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta, \\quad \\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta",
      description: "正弦・余弦の加法定理（複号同順）"
    },
    {
      category: "数学II: 三角関数",
      keywords: ["正接の加法定理", "tanの加法定理"],
      latex: "\\tan(\\alpha \\pm \\beta) = \\frac{\\tan\\alpha \\pm \\tan\\beta}{1 \\mp \\tan\\alpha\\tan\\beta}",
      description: "タンジェントの加法定理"
    },
    {
      category: "数学II: 三角関数",
      keywords: ["2倍角の公式", "倍角の公式"],
      latex: "\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha, \\quad \\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha = 2\\cos^2\\alpha - 1 = 1 - 2\\sin^2\\alpha",
      description: "2倍角に関する正弦・余弦の公式"
    },
    {
      category: "数学II: 三角関数",
      keywords: ["半角の公式"],
      latex: "\\sin^2\\frac{\\alpha}{2} = \\frac{1 - \\cos\\alpha}{2}, \\quad \\cos^2\\frac{\\alpha}{2} = \\frac{1 + \\cos\\alpha}{2}",
      description: "半角の正弦・余弦の公式"
    },
    {
      category: "数学II: 三角関数",
      keywords: ["三角関数の合成", "単振動の合成"],
      latex: "a \\sin\\theta + b \\cos\\theta = \\sqrt{a^2 + b^2}\\sin(\\theta + \\alpha) \\quad \\left(\\cos\\alpha = \\frac{a}{\\sqrt{a^2+b^2}}, \\, \\sin\\alpha = \\frac{b}{\\sqrt{a^2+b^2}}\\right)",
      description: "同周期のsinとcosの和を1つのsinにまとめる公式"
    },
    {
      category: "数学II: 指数関数・対数関数",
      keywords: ["底の変換公式", "対数の底の変換公式"],
      latex: "\\log_a b = \\frac{\\log_c b}{\\log_c a}",
      description: "対数の底を新たな底 c に変換する公式"
    },
    {
      category: "数学II: 指数関数・対数関数",
      keywords: ["対数の性質", "対数法則"],
      latex: "\\log_a (xy) = \\log_a x + \\log_a y, \\quad \\log_a \\left(\\frac{x}{y}\\right) = \\log_a x - \\log_a y, \\quad \\log_a (x^k) = k \\log_a x",
      description: "対数計算の基本性質"
    },
    {
      category: "数学II: 微分・積分",
      keywords: ["導関数の定義", "微分の定義"],
      latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}",
      description: "導関数（微係数）の定義"
    },
    {
      category: "数学II: 微分・積分",
      keywords: ["x^nの微分", "べき乗の微分"],
      latex: "(x^n)' = n x^{n - 1}",
      description: "多項式の基本微分公式"
    },
    {
      category: "数学II: 微分・積分",
      keywords: ["接線の方程式"],
      latex: "y - f(a) = f'(a)(x - a)",
      description: "曲線 y=f(x) 上の点 (a, f(a)) における接線"
    },
    {
      category: "数学II: 微分・積分",
      keywords: ["定積分の基本定理", "微積分学の基本定理"],
      latex: "\\int_a^b f(x)\\,dx = \\left[ F(x) \\right]_a^b = F(b) - F(a) \\quad (F'(x) = f(x))",
      description: "微分と積分の基本関係"
    },
    {
      category: "数学II: 微分・積分",
      keywords: ["1/6公式", "放物線と直線の面積公式", "6分の1公式"],
      latex: "S = \\int_{\\alpha}^{\\beta} a(x - \\alpha)(x - \\beta)\\,dx = \\frac{|a|}{6}(\\beta - \\alpha)^3",
      description: "2次曲線と直線などで囲まれた図形の面積"
    },

    // --- 数学B ---
    {
      category: "数学B: 数列",
      keywords: ["等差数列の一般項"],
      latex: "a_n = a_1 + (n - 1)d",
      description: "初項 a1, 公差 d の等差数列の第n項"
    },
    {
      category: "数学B: 数列",
      keywords: ["等差数列の和"],
      latex: "S_n = \\frac{1}{2}n(a_1 + a_n) = \\frac{1}{2}n\\{2a_1 + (n - 1)d\\}",
      description: "初項から第n項までの等差数列の和"
    },
    {
      category: "数学B: 数列",
      keywords: ["等比数列の一般項"],
      latex: "a_n = a_1 r^{n - 1}",
      description: "初項 a1, 公比 r の等比数列の第n項"
    },
    {
      category: "数学B: 数列",
      keywords: ["等比数列の和"],
      latex: "S_n = \\frac{a_1(1 - r^n)}{1 - r} = \\frac{a_1(r^n - 1)}{r - 1} \\quad (r \\neq 1)",
      description: "初項 a1, 公比 r の等比数列の和"
    },
    {
      category: "数学B: 数列",
      keywords: ["シグマ公式k", "シグマk", "自然数の和"],
      latex: "\\sum_{k=1}^n k = \\frac{1}{2}n(n + 1)",
      description: "1からnまでの自然数の和"
    },
    {
      category: "数学B: 数列",
      keywords: ["シグマ公式k^2", "シグマk2", "シグマk^2", "2乗の和"],
      latex: "\\sum_{k=1}^n k^2 = \\frac{1}{6}n(n + 1)(2n + 1)",
      description: "1からnまでの2乗の和"
    },
    {
      category: "数学B: 数列",
      keywords: ["シグマ公式k^3", "シグマk3", "シグマk^3", "3乗の和"],
      latex: "\\sum_{k=1}^n k^3 = \\left\\{ \\frac{1}{2}n(n + 1) \\right\\}^2",
      description: "1からnまでの3乗の和"
    },
    {
      category: "数学B: 数列",
      keywords: ["階差数列"],
      latex: "a_n = a_1 + \\sum_{k=1}^{n-1} b_k \\quad (n \\ge 2)",
      description: "階差数列 {bk} を用いた一般項"
    },
    {
      category: "数学B: 統計的な推測",
      keywords: ["期待値", "確率変数の平均"],
      latex: "E(X) = \\sum_{i=1}^n x_i p_i",
      description: "確率変数 X の期待値"
    },
    {
      category: "数学B: 統計的な推測",
      keywords: ["二項分布の平均と分散", "二項分布"],
      latex: "E(X) = np, \\quad V(X) = np(1 - p), \\quad \\sigma(X) = \\sqrt{np(1 - p)}",
      description: "二項分布 B(n, p) の特性値"
    },
    {
      category: "数学B: 統計的な推測",
      keywords: ["正規分布の標準化"],
      latex: "Z = \\frac{X - m}{\\sigma} \\sim N(0, 1)",
      description: "平均 m, 分散 σ^2 の正規分布の標準化"
    },
    {
      category: "数学B: 統計的な推測",
      keywords: ["母平均の信頼区間95%", "信頼区間95%"],
      latex: "\\left[ \\bar{X} - 1.96\\frac{\\sigma}{\\sqrt{n}}, \\, \\bar{X} + 1.96\\frac{\\sigma}{\\sqrt{n}} \\right]",
      description: "正規母集団に対する母平均の95%信頼区間"
    },

    // --- 数学C ---
    {
      category: "数学C: ベクトル",
      keywords: ["ベクトルの内積", "内積の定義"],
      latex: "\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta = a_1 b_1 + a_2 b_2",
      description: "幾何学的定義と成分表示による内積"
    },
    {
      category: "数学C: ベクトル",
      keywords: ["ベクトルのなす角", "なす角cos"],
      latex: "\\cos\\theta = \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}||\\vec{b}|} = \\frac{a_1 b_1 + a_2 b_2}{\\sqrt{a_1^2 + a_2^2}\\sqrt{b_1^2 + b_2^2}}",
      description: "2つのベクトルのなす角θの余弦"
    },
    {
      category: "数学C: ベクトル",
      keywords: ["ベクトルの垂直条件"],
      latex: "\\vec{a} \\perp \\vec{b} \\iff \\vec{a} \\cdot \\vec{b} = 0",
      description: "零ベクトルでない2つのベクトルの垂直条件"
    },
    {
      category: "数学C: ベクトル",
      keywords: ["三角形の面積ベクトル", "ベクトルによる面積"],
      latex: "S = \\frac{1}{2}\\sqrt{|\\vec{a}|^2|\\vec{b}|^2 - (\\vec{a}\\cdot\\vec{b})^2} = \\frac{1}{2}|a_1 b_2 - a_2 b_1|",
      description: "2本のベクトルが張る三角形の面積"
    },
    {
      category: "数学C: 平面上の曲線と複素数平面",
      keywords: ["楕円の方程式", "楕円の標準形"],
      latex: "\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (a > b > 0, \\, \\text{焦点: } (\\pm\\sqrt{a^2 - b^2}, 0))",
      description: "中心を原点とする楕円の標準形"
    },
    {
      category: "数学C: 平面上の曲線と複素数平面",
      keywords: ["双曲線の方程式", "双曲線の標準形"],
      latex: "\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1 \\quad (\\text{漸近線: } y = \\pm \\frac{b}{a}x)",
      description: "中心を原点とする双曲線の標準形"
    },
    {
      category: "数学C: 平面上の曲線と複素数平面",
      keywords: ["放物線の標準形"],
      latex: "y^2 = 4px \\quad (\\text{焦点: } (p, 0), \\, \\text{準線: } x = -p)",
      description: "頂点を原点とする放物線"
    },
    {
      category: "数学C: 平面上の曲線と複素数平面",
      keywords: ["複素数の極形式"],
      latex: "z = r(\\cos\\theta + i\\sin\\theta) \\quad (r = |z|, \\, \\theta = \\arg z)",
      description: "複素数の絶対値と偏角による表現"
    },
    {
      category: "数学C: 平面上の曲線と複素数平面",
      keywords: ["ド・モアブルの定理", "ドモアブルの定理"],
      latex: "(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)",
      description: "複素数の累乗に関する基本定理"
    },

    // --- 数学III ---
    {
      category: "数学III: 極限",
      keywords: ["ネイピア数の定義", "自然対数の底e", "極限e"],
      latex: "e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = \\lim_{x \\to 0} (1 + x)^{\\frac{1}{x}}",
      description: "自然対数の底 e の極限定義"
    },
    {
      category: "数学III: 極限",
      keywords: ["sinx/xの極限", "sin(x)/xの極限"],
      latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
      description: "三角関数の基本的な極限公式（xは弧度法）"
    },
    {
      category: "数学III: 微分法",
      keywords: ["積の導関数", "積の微分法"],
      latex: "\\{f(x)g(x)\\}' = f'(x)g(x) + f(x)g'(x)",
      description: "2つの関数の積の微分法"
    },
    {
      category: "数学III: 微分法",
      keywords: ["商の導関数", "商の微分法"],
      latex: "\\left\\{ \\frac{f(x)}{g(x)} \\right\\}' = \\frac{f'(x)g(x) - f(x)g'(x)}{\\{g(x)\\}^2}",
      description: "分数関数の微分法"
    },
    {
      category: "数学III: 微分法",
      keywords: ["合成関数の微分", "合成関数の微分法"],
      latex: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}",
      description: "合成関数の微分公式"
    },
    {
      category: "数学III: 微分法",
      keywords: ["逆関数の微分", "逆関数の微分法"],
      latex: "\\frac{dy}{dx} = \\frac{1}{\\frac{dx}{dy}}",
      description: "逆関数の導関数公式"
    },
    {
      category: "数学III: 微分法",
      keywords: ["三角関数の微分", "sinの微分", "cosの微分", "tanの微分"],
      latex: "(\\sin x)' = \\cos x, \\quad (\\cos x)' = -\\sin x, \\quad (\\tan x)' = \\frac{1}{\\cos^2 x}",
      description: "主要な三角関数の導関数"
    },
    {
      category: "数学III: 微分法",
      keywords: ["指数対数の微分", "e^xの微分", "logxの微分"],
      latex: "(e^x)' = e^x, \\quad (a^x)' = a^x \\ln a, \\quad (\\ln|x|)' = \\frac{1}{x}",
      description: "指数関数・対数関数の導関数"
    },
    {
      category: "数学III: 積分法",
      keywords: ["置換積分", "置換積分法"],
      latex: "\\int f(g(t))g'(t)\\,dt = \\int f(x)\\,dx \\quad (x = g(t))",
      description: "変数変換による積分計算法"
    },
    {
      category: "数学III: 積分法",
      keywords: ["置換積分定積分"],
      latex: "\\int_a^b f(g(t))g'(t)\\,dt = \\int_{g(a)}^{g(b)} f(x)\\,dx",
      description: "定積分の置換積分公式"
    },
    {
      category: "数学III: 積分法",
      keywords: ["部分積分", "部分積分法"],
      latex: "\\int f(x)g'(x)\\,dx = f(x)g(x) - \\int f'(x)g(x)\\,dx",
      description: "関数の積に対する積分公式"
    },
    {
      category: "数学III: 積分法",
      keywords: ["区分求積法"],
      latex: "\\lim_{n \\to \\infty} \\frac{1}{n} \\sum_{k=1}^n f\\left(\\frac{k}{n}\\right) = \\int_0^1 f(x)\\,dx",
      description: "数列の和の極限を定積分に結びつける公式"
    },
    {
      category: "数学III: 積分法",
      keywords: ["回転体の体積", "x軸まわりの回転体"],
      latex: "V = \\pi \\int_a^b \\{f(x)\\}^2\\,dx",
      description: "y = f(x) を x 軸まわりに1回転させてできる立体の体積"
    },
    {
      category: "数学III: 積分法",
      keywords: ["曲線の長さ"],
      latex: "L = \\int_a^b \\sqrt{1 + \\{f'(x)\\}^2}\\,dx = \\int_{\\alpha}^{\\beta} \\sqrt{\\left(\\frac{dx}{dt}\\right)^2 + \\left(\\frac{dy}{dt}\\right)^2}\\,dt",
      description: "平面曲線の弧長公式"
    }
  ],

  // ==========================================
  // 2. 記号・関数・トークン置換辞書
  // ==========================================
  tokenReplacements: [
    // ギリシャ文字
    { pattern: /\\?(alpha|アルファ)/gi, replace: "\\alpha" },
    { pattern: /\\?(beta|ベータ)/gi, replace: "\\beta" },
    { pattern: /\\?(gamma|ガンマ)/gi, replace: "\\gamma" },
    { pattern: /\\?(theta|シータ|テータ)/gi, replace: "\\theta" },
    { pattern: /\\?(lambda|ラムダ)/gi, replace: "\\lambda" },
    { pattern: /\\?(mu|ミュー)/gi, replace: "\\mu" },
    { pattern: /\\?(sigma|シグマ)(?!_)/gi, replace: "\\sigma" },
    { pattern: /\\?(omega|オメガ)/gi, replace: "\\omega" },
    { pattern: /\\?(pi|パイ|π)/gi, replace: "\\pi" },
    { pattern: /\\?(Delta|デルタ)/g, replace: "\\Delta" },

    // 演算子・記号
    { pattern: /\+\-/g, replace: "\\pm" },
    { pattern: /±/g, replace: "\\pm" },
    { pattern: /\-\+/g, replace: "\\mp" },
    { pattern: /∓/g, replace: "\\mp" },
    { pattern: /×/g, replace: "\\times" },
    { pattern: /÷/g, replace: "\\div" },
    { pattern: /・/g, replace: "\\cdot" },
    { pattern: /<=|≦/g, replace: "\\le" },
    { pattern: />=|≧/g, replace: "\\ge" },
    { pattern: /!=|≠/g, replace: "\\neq" },
    { pattern: /≒|~=/g, replace: "\\fallingdotseq" },
    { pattern: /∞|infinity|inf/gi, replace: "\\infty" },
    { pattern: /->|→/g, replace: "\\to" },

    // 集合記号
    { pattern: /∈/g, replace: "\\in" },
    { pattern: /∉/g, replace: "\\notin" },
    { pattern: /⊂/g, replace: "\\subset" },
    { pattern: /⊆/g, replace: "\\subseteq" },
    { pattern: /∩/g, replace: "\\cap" },
    { pattern: /∪/g, replace: "\\cup" },
    { pattern: /∅|空集合/g, replace: "\\emptyset" }
  ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MATH_DICTIONARY;
}

