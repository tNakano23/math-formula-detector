/**
 * 数式検知・LaTeX変換アプリケーション ロジック
 * 高校数学公式辞書連携 & ドキュメント/PDFコピペ（改行分数・数学Unicode・表記号）対応
 */

class MathFormulaDetector {
  constructor(dictionary) {
    this.dict = dictionary;
  }

  /**
   * 与えられたテキストから数式箇所を検知・抽出し、LaTeX形式に変換してリストで返す
   * @param {string} text 入力文字列
   * @returns {Array} 検出結果オブジェクトの配列
   */
  detectAndConvert(text) {
    if (!text || typeof text !== "string") return [];

    const results = [];
    const usedRanges = []; // 重複抽出を防ぐための範囲管理 [{start, end}]

    const isOverlapping = (start, end) => {
      return usedRanges.some(r => Math.max(start, r.start) < Math.min(end, r.end));
    };

    const addResult = (original, latex, type, category, start, end, description = "") => {
      results.push({
        id: results.length + 1,
        original: original.trim(),
        latex: latex.trim(),
        type,
        category: category || "一般数式",
        description,
        range: [start, end]
      });
      usedRanges.push({ start, end });
    };

    // ----------------------------------------------------
    // ステップ 1: 明示的なLaTeX記法 ($...$, $$...$$, `...`) の検出
    // ----------------------------------------------------
    const explicitRegexes = [
      { regex: /\$\$([\s\S]+?)\$\$/g, type: "TeXブロック ($$...$$)" },
      { regex: /\$([^$\n]+?)\$/g, type: "TeXインライン ($...$)" },
      { regex: /`([^`\n]+?)`/g, type: "コード形式 (`...`)" }
    ];

    for (const { regex, type } of explicitRegexes) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (!isOverlapping(start, end)) {
          const content = match[1];
          const converted = this.convertRawExpressionToLatex(content);
          addResult(match[0], converted, type, "明示的数式記法", start, end);
        }
      }
    }

    // ----------------------------------------------------
    // ステップ 2: 公式辞書（名称・キーワード）によるマッチング
    // ----------------------------------------------------
    if (this.dict && this.dict.namedFormulas) {
      const sortedNamed = [...this.dict.namedFormulas].sort((a, b) => {
        const maxLenA = Math.max(...a.keywords.map(k => k.length));
        const maxLenB = Math.max(...b.keywords.map(k => k.length));
        return maxLenB - maxLenA;
      });

      for (const formula of sortedNamed) {
        for (const kw of formula.keywords) {
          let pos = 0;
          while ((pos = text.indexOf(kw, pos)) !== -1) {
            const start = pos;
            const end = pos + kw.length;
            if (!isOverlapping(start, end)) {
              addResult(
                kw,
                formula.latex,
                "公式名辞書マッチ",
                formula.category,
                start,
                end,
                formula.description
              );
            }
            pos = end;
          }
        }
      }
    }

    // ----------------------------------------------------
    // ステップ 3: ドキュメント/PDFコピー（表の記号・改行を含む等式数式ブロック）の検出
    // ----------------------------------------------------
    const lines = text.split(/\r?\n/);
    let lineOffset = 0;

    let i = 0;
    while (i < lines.length) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();
      const currentStart = lineOffset;
      const currentEnd = lineOffset + rawLine.length;

      // ヘッダー行「記号 意味 単位」や単独の単位行ハイフン「-」はスキップ
      if (/^記号\s+意味\s+単位/.test(trimmed) || trimmed === "-") {
        lineOffset += rawLine.length + 1;
        i++;
        continue;
      }

      // パターン 3-A: 等号「=」を含む数式（改行で縦並びになった分数等を含む可能性あり）
      if (trimmed.includes("=") && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{4,}/.test(trimmed.split("=")[0])) {
        let formulaBlock = rawLine;
        let j = i + 1;
        let nextOffset = currentEnd + 1;
        let openParenCount = (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
        let isWaitingFraction = /=\s*$/.test(trimmed);

        while (j < lines.length) {
          const nextLine = lines[j];
          const nextTrim = nextLine.trim();

          // 終了判定: 日本語解説文、または単位ハイフン「-」のみの行、または次の等式
          if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(nextTrim) && !isWaitingFraction && openParenCount <= 0) break;
          if (nextTrim === "-") break;
          if (nextTrim.includes("=") && j > i + 1) break;

          formulaBlock += "\n" + nextLine;
          openParenCount += (nextTrim.match(/\(/g) || []).length - (nextTrim.match(/\)/g) || []).length;

          if (isWaitingFraction && nextTrim.length > 0) {
            const nonBlankLines = formulaBlock.split("\n").filter(l => l.trim()).length;
            if (nonBlankLines >= 3) {
              isWaitingFraction = false;
            }
          }

          nextOffset += nextLine.length + 1;
          j++;

          if (openParenCount <= 0 && !isWaitingFraction && nextTrim.endsWith(")")) {
            break;
          }
          if (openParenCount <= 0 && !isWaitingFraction && j >= i + 3) {
            break;
          }
        }

        const blockEnd = currentStart + formulaBlock.length;
        if (!isOverlapping(currentStart, blockEnd)) {
          const converted = this.convertRawExpressionToLatex(formulaBlock);
          addResult(formulaBlock, converted, "等式・算式検知", "工学・規則算式", currentStart, blockEnd);
        }

        lineOffset = nextOffset;
        i = j;
        continue;
      }

      // パターン 3-B: 表の記号列（独立行に置かれた英字・数学イタリック記号: 例 𝐶𝑊_𝐿𝐶, 𝐶𝑉𝑃_𝐿𝐶）
      if (/^[\u{1D400}-\u{1D7FF}A-Za-z0-9_]+$/u.test(trimmed)) {
        if (!isOverlapping(currentStart, currentEnd)) {
          const converted = this.convertRawExpressionToLatex(trimmed);
          addResult(trimmed, converted, "表記号検知", "変数・係数記号", currentStart, currentEnd);
        }
        lineOffset += rawLine.length + 1;
        i++;
        continue;
      }

      // パターン 3-C: 「V 最大航海速力（1.4.3.1-7 参照） knot」のように行頭に独立した英字変数がある場合
      const rowMatch = trimmed.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF].*)/u);
      if (rowMatch) {
        const symbol = rowMatch[1];
        const symStart = currentStart;
        const symEnd = currentStart + symbol.length;
        if (!isOverlapping(symStart, symEnd)) {
          const converted = this.convertRawExpressionToLatex(symbol);
          addResult(symbol, converted, "表記号検知", "変数・係数記号", symStart, symEnd, "行頭の独立変数記号");
        }
      }

      lineOffset += rawLine.length + 1;
      i++;
    }

    // ----------------------------------------------------
    // ステップ 4: テキスト中の一般的な数式パターンの検知
    // ----------------------------------------------------
    const mathPattern = /((?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+[=<>≦≧≠≒+\-*\/×÷±∓^−]\s*(?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+)/gu;

    let mMatch;
    while ((mMatch = mathPattern.exec(text)) !== null) {
      let candidate = mMatch[0].trim();
      let start = mMatch.index;
      let end = start + mMatch[0].length;

      while (/[。、,.!?]$/.test(candidate)) {
        candidate = candidate.slice(0, -1).trim();
        end--;
      }

      const mathCharCount = (candidate.match(/[0-9a-zA-Z\u{1D400}-\u{1D7FF}=+\-*/^√∫∑<>≦≧≠−]/gu) || []).length;
      if (mathCharCount >= 3 && !isOverlapping(start, end)) {
        const converted = this.convertRawExpressionToLatex(candidate);
        addResult(candidate, converted, "構文検知", "代数・関数・方程式", start, end);
      }
    }

    // ----------------------------------------------------
    // ステップ 5: 高校数学特有表記（順列組合せ, ベクトル, 根号）
    // ----------------------------------------------------
    const specificPatterns = [
      { regex: /\b([0-9nkm])\s*([CPH])\s*([0-9rkm])\b/g, cat: "場合の数・確率", desc: "順列・組合せ" },
      { regex: /\bvec\(([A-Za-z0-9]+)\)/g, cat: "ベクトル", desc: "ベクトル記法" },
      { regex: /(?:ベクトル|vec)\s*([A-Z]{2}|[a-z])/g, cat: "ベクトル", desc: "ベクトル記法" },
      { regex: /\b(?:sqrt|√)\s*\(([^)]+)\)|\b(?:sqrt|√)\s*([a-zA-Z0-9]+)/g, cat: "根号・無理数", desc: "平方根" }
    ];

    for (const pat of specificPatterns) {
      let sMatch;
      while ((sMatch = pat.regex.exec(text)) !== null) {
        const start = sMatch.index;
        const end = start + sMatch[0].length;
        if (!isOverlapping(start, end)) {
          const converted = this.convertRawExpressionToLatex(sMatch[0]);
          addResult(sMatch[0], converted, "記号構文検知", pat.cat, start, end, pat.desc);
        }
      }
    }

    // 出現順に並び替え
    results.sort((a, b) => a.range[0] - b.range[0]);
    results.forEach((item, index) => {
      item.id = index + 1;
    });

    return results;
  }

  /**
   * テキスト形式の数式文字列を整ったLaTeXに変換
   * @param {string} expr 
   * @returns {string} LaTeX表現
   */
  convertRawExpressionToLatex(expr) {
    if (!expr) return "";
    let s = expr.trim();

    // 先頭・末尾の $, $$, ` を除去
    s = s.replace(/^(\$\$|\$|`)+|(\$\$|\$|`)+$/g, "");

    // 1. 改行された縦並び分数の復元 (PDFコピペ対策)
    // 括弧内の縦並び分数: ( 1 - \n CB \n CW \n? ) -> ( 1 - \frac{CB}{CW} )
    s = s.replace(/\(([^()\n]+?)\s*([+\-−*\/])\s*\n\s*([^\s()\n]+)\s*\n\s*([^\s()\n]+)\s*\n?\s*\)/gu, (match, left, op, num, den) => {
      return `(${this.convertRawExpressionToLatex(left.trim())} ${op} \\frac{${this.convertRawExpressionToLatex(num)}}{${this.convertRawExpressionToLatex(den)}})`;
    });

    // 等号直後の縦並び分数: = \n CB_LC \n CW_LC -> = \frac{CB_LC}{CW_LC}
    s = s.replace(/=\s*\n\s*([^\s=\n]+)\s*\n\s*([^\s=\n]+)/gu, (match, num, den) => {
      return `= \\frac{${this.convertRawExpressionToLatex(num)}}{${this.convertRawExpressionToLatex(den)}}`;
    });

    // 改行をスペースに置換
    s = s.replace(/\s*\n\s*/g, " ");

    // 2. 記号・トークン変換辞書による置換 (Greek, operators etc.)
    if (this.dict && this.dict.tokenReplacements) {
      for (const item of this.dict.tokenReplacements) {
        s = s.replace(item.pattern, item.replace);
      }
    }

    // 3. 識別子（変数・添字）の整形
    // 例: 𝐶𝑊_𝐿𝐶 -> 𝐶_{𝑊_𝐿𝐶}, 𝐶𝑉𝑃_𝐿𝐶 -> 𝐶_{𝑉𝑃_𝐿𝐶}, 𝐶𝐵_𝐿𝐶 -> 𝐶_{𝐵_𝐿𝐶}, 𝐶𝑊 -> 𝐶_{𝑊}, 𝐶𝐵 -> 𝐶_𝐵, 𝑓𝑇 -> 𝑓_{𝑇}
    s = s.replace(/[\u{1D400}-\u{1D7FF}A-Za-z0-9_]+/gu, (token) => {
      // 予約語やコマンド、純粋な数字はスキップ
      if (/^\d+$/.test(token)) return token;
      if (/^(sin|cos|tan|log|ln|exp|lim|sum|int|sqrt|cbrt|frac|vec|mathrm)$/.test(token)) return token;
      return this.normalizeIdentifier(token);
    });

    // 4. 順列・組合せ (nCr, nPr, nHr)
    s = s.replace(/([0-9a-zA-Z]+)\s*([CPH])\s*([0-9a-zA-Z]+)/g, (match, n, type, r) => {
      return `{}_{${n}}\\mathrm{${type}}_{${r}}`;
    });

    // 5. ベクトル
    s = s.replace(/(?:ベクトル|vec)\s*([A-Z]{2})/g, "\\overrightarrow{$1}");
    s = s.replace(/\bvec\(([A-Z]{2})\)/g, "\\overrightarrow{$1}");
    s = s.replace(/(?:ベクトル|vec)\s*([a-zA-Z])/g, "\\vec{$1}");
    s = s.replace(/\bvec\(([a-zA-Z])\)/g, "\\vec{$1}");

    // 6. 極限 lim
    s = s.replace(/lim\s*\(\s*([a-zA-Z])\s*(?:->|\\to)\s*([^,)]+)\s*,\s*([^)]+)\)/g, "\\lim_{$1 \\to $2} $3");
    s = s.replace(/lim_\{?([a-zA-Z])\s*(?:->|\\to)\s*([^}]+)\}?/g, "\\lim_{$1 \\to $2}");
    s = s.replace(/\blim\b/g, "\\lim");

    // 7. シグマ sum
    s = s.replace(/sum_\{?([^}]+)\}?\^\{?([^}]+)\}?/g, "\\sum_{$1}^{$2}");
    s = s.replace(/∑_\{?([^}]+)\}?\^\{?([^}]+)\}?/g, "\\sum_{$1}^{$2}");
    s = s.replace(/\b(sum|∑)\b/g, "\\sum");

    // 8. 積分 int / ∫
    s = s.replace(/(?:int|∫)_\{?([^}^_]+)\}?\^\{?([^}]+)\}?/g, "\\int_{$1}^{$2}");
    s = s.replace(/(?:int|∫)\s*\(([^,]+),([^,]+),([^)]+)\)/g, "\\int_{$1}^{$2} $3");
    s = s.replace(/\b(int|∫)\b/g, "\\int");

    // 9. 平方根・累乗根
    s = s.replace(/\bcbrt\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
    s = s.replace(/(?:sqrt|√)\s*\(([^)]+)\)/g, "\\sqrt{$1}");
    s = s.replace(/(?:sqrt|√)\s*([0-9a-zA-Z]+)/g, "\\sqrt{$1}");

    // 10. 関数名正規化
    s = s.replace(/\b(sin|cos|tan|log|ln|exp|max|min|det)\b(?!\s*\\)/g, "\\$1");

    // 11. 乗算記号 * の変換
    s = s.replace(/\s*\*\s*/g, " \\cdot ");

    // 12. 分数の簡易変換: (A)/(B) -> \frac{A}{B}
    let prev;
    do {
      prev = s;
      s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
    } while (s !== prev);

    s = s.replace(/([0-9a-zA-Z\\]+)\s*\/\s*([0-9a-zA-Z\\]+)/g, (match, num, den) => {
      if (num.startsWith("\\frac") || den.startsWith("\\frac")) return match;
      return `\\frac{${num}}{${den}}`;
    });

    // 13. 指数 ^ と下付き _ の括弧囲み保証
    s = s.replace(/\^([a-zA-Z0-9+\-]+)(?!})/g, "^{$1}");

    // 14. 微分記法 f'(x), dy/dx
    s = s.replace(/d([a-zA-Z])\/d([a-zA-Z])/g, "\\frac{d$1}{d$2}");

    // 括弧前後の空白調整
    s = s.replace(/\s*\)/g, ")");
    s = s.replace(/\(\s*/g, "(");
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  /**
   * 変数・添字識別子の整形
   */
  normalizeIdentifier(id) {
    // 1. 基底1文字 + 添字1 + '_' + 添字2 (例: 𝐶𝑊_𝐿𝐶 -> 𝐶_{𝑊_𝐿𝐶}, 𝐶𝑉𝑃_𝐿𝐶 -> 𝐶_{𝑉𝑃_𝐿𝐶}, 𝐶𝐵_𝐿𝐶 -> 𝐶_{𝐵_𝐿𝐶})
    let m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([\u{1D400}-\u{1D7FF}A-Za-z]*)_([\u{1D400}-\u{1D7FF}A-Za-z0-9_]+)$/u);
    if (m) {
      if (m[2]) {
        return `${m[1]}_{${m[2]}_${m[3]}}`;
      } else {
        return `${m[1]}_{${m[3]}}`;
      }
    }

    // 2. 2文字の数学イタリック文字: 𝐶𝑊 -> 𝐶_{𝑊}, 𝐶𝐵 -> 𝐶_𝐵, 𝑓𝑇 -> 𝑓_{𝑇}
    m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([\u{1D400}-\u{1D7FF}A-Za-z])$/u);
    if (m) {
      if (id === "𝐶𝐵") return `${m[1]}_${m[2]}`;
      return `${m[1]}_{${m[2]}}`;
    }

    return id;
  }
}

// ==========================================
// UI インタラクション & KaTeX レンダリング
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const detector = new MathFormulaDetector(MATH_DICTIONARY);

  const inputText = document.getElementById("inputText");
  const detectBtn = document.getElementById("detectBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn1 = document.getElementById("sampleBtn1");
  const sampleBtn2 = document.getElementById("sampleBtn2");
  const sampleBtn3 = document.getElementById("sampleBtn3");
  const sampleBtn4 = document.getElementById("sampleBtn4");
  const autoDetectCheckbox = document.getElementById("autoDetect");

  const resultsSection = document.getElementById("resultsSection");
  const resultsTableBody = document.getElementById("resultsTableBody");
  const resultCountBadge = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const copyToast = document.getElementById("copyToast");

  const dictContainer = document.getElementById("dictContainer");
  const dictSearch = document.getElementById("dictSearch");

  // サンプルテキスト定義
  const samples = {
    sample1: `【高校数学 総合問題サンプル】
放物線 y = ax^2 + bx + c の頂点を求めるために平方完成を行います。
2次方程式の解は 解の公式 x = (-b +- sqrt(b^2 - 4ac))/(2a) によって導出されます。
判別式 D = b^2 - 4ac を用いると、D > 0 のとき異なる2つの実数解を持ちます。

また、三角形ABCにおいて、外接円の半径を R とするとき、正弦定理 a/sin A = b/sin B = c/sin C = 2R が成り立ちます。
さらに、余弦定理 a^2 = b^2 + c^2 - 2bc*cos(A) も重要です。`,

    sample2: `【数B・数III 微積分と極限・数列】
等差数列の一般項は a_n = a_1 + (n - 1)d で表され、等差数列の和は S_n = n(a_1 + a_n)/2 です。
シグマの計算では sum_{k=1}^n k = n(n+1)/2 や 自然数の和 が頻出です。

極限値の公式として lim_{x->0} (sin x)/x = 1 や ネイピア数の定義 e = lim_{n->inf} (1 + 1/n)^n があります。
微分法では 積の導関数 (f*g)' = f'*g + f*g' や 合成関数の微分 dy/dx = (dy/du)*(du/dx) を使います。
定積分の計算例: int_0^1 x^2 dx = 1/3`,

    sample3: `【数A・数C ベクトルと確率・複素数】
10人の中から委員長と副委員長を選ぶ方法は順列 10P2 であり、3人の委員を選ぶ方法は組合せ 10C3 です。
反復試行の確率 や 条件付き確率 P(B|A) = P(A∩B)/P(A) も重要です。

ベクトルにおいて、内積の定義は vec(a)・vec(b) = |vec(a)||vec(b)|cos(theta) であり、
ベクトルの垂直条件は vec(a)・vec(b) = 0 です。
複素数平面では ド・モアブルの定理 (cos(theta) + i*sin(theta))^n = cos(n*theta) + i*sin(n*theta) が成り立ちます。`,

    sample4: `記号 意味 単位
𝐶𝑊_𝐿𝐶
考慮している積付状態における水線面積係数。ただし，この値が予め求められ
ていない場合，次の算式を用いても差し支えない。
𝐶𝑊_𝐿𝐶 = 𝐶𝑊 − 1.42 (1 −
𝐶𝐵
𝐶𝑊
) (1 − 𝑓𝑇
)
-
𝐶𝑉𝑃_𝐿𝐶
考慮している積付状態における竪柱形係数で，次の算式による。
𝐶𝑉𝑃_𝐿𝐶 =
𝐶𝐵_𝐿𝐶
𝐶𝑊_𝐿𝐶
-
V 最大航海速力（1.4.3.1-7 参照） knot`
  };

  function showToast(message) {
    if (!copyToast) return;
    copyToast.textContent = message;
    copyToast.classList.add("show");
    setTimeout(() => {
      copyToast.classList.remove("show");
    }, 2200);
  }

  function copyToClipboard(text, successMsg = "コピーしました！") {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(err => {
      console.error("Copy failed", err);
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(successMsg);
    });
  }

  function runDetection() {
    const text = inputText.value;
    if (!text.trim()) {
      resultsTableBody.innerHTML = "";
      resultCountBadge.textContent = "0 件";
      emptyState.style.display = "block";
      resultsSection.style.display = "none";
      return;
    }

    const items = detector.detectAndConvert(text);
    resultCountBadge.textContent = `${items.length} 件`;

    if (items.length === 0) {
      resultsTableBody.innerHTML = "";
      emptyState.style.display = "block";
      resultsSection.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    resultsSection.style.display = "block";
    resultsTableBody.innerHTML = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      // No.
      const tdNo = document.createElement("td");
      tdNo.className = "col-no";
      tdNo.textContent = item.id;
      tr.appendChild(tdNo);

      // カテゴリ・検出種別
      const tdType = document.createElement("td");
      tdType.className = "col-type";
      tdType.innerHTML = `
        <span class="badge badge-cat">${escapeHtml(item.category)}</span>
        <span class="badge badge-type">${escapeHtml(item.type)}</span>
        ${item.description ? `<div class="sub-desc">${escapeHtml(item.description)}</div>` : ""}
      `;
      tr.appendChild(tdType);

      // 元の文字列
      const tdOriginal = document.createElement("td");
      tdOriginal.className = "col-orig";
      const codeOrig = document.createElement("code");
      codeOrig.textContent = item.original;
      tdOriginal.appendChild(codeOrig);
      tr.appendChild(tdOriginal);

      // LaTeXコード
      const tdLatex = document.createElement("td");
      tdLatex.className = "col-latex";
      const preLatex = document.createElement("div");
      preLatex.className = "latex-code-box";
      preLatex.textContent = item.latex;
      tdLatex.appendChild(preLatex);
      tr.appendChild(tdLatex);

      // KaTeX プレビュー描画
      const tdPreview = document.createElement("td");
      tdPreview.className = "col-preview";
      const previewDiv = document.createElement("div");
      previewDiv.className = "katex-rendered";
      
      try {
        if (window.katex) {
          window.katex.render(item.latex, previewDiv, {
            displayMode: true,
            throwOnError: false
          });
        } else {
          previewDiv.textContent = item.latex;
        }
      } catch (e) {
        previewDiv.innerHTML = `<span class="render-error">描画エラー: ${escapeHtml(e.message)}</span>`;
      }
      tdPreview.appendChild(previewDiv);
      tr.appendChild(tdPreview);

      // アクション（コピーボタン等）
      const tdAction = document.createElement("td");
      tdAction.className = "col-action";
      const copyBtn = document.createElement("button");
      copyBtn.className = "btn-secondary btn-sm";
      copyBtn.innerHTML = `📋 LaTeXコピー`;
      copyBtn.title = "この数式のLaTeXコードをコピー";
      copyBtn.addEventListener("click", () => {
        copyToClipboard(item.latex, `数式 #${item.id} のLaTeXをコピーしました`);
      });

      const insertBtn = document.createElement("button");
      insertBtn.className = "btn-secondary btn-sm";
      insertBtn.innerHTML = `➕ $付与コピー`;
      insertBtn.title = "$...$ で囲んでコピー";
      insertBtn.addEventListener("click", () => {
        copyToClipboard(`$${item.latex}$`, `$で囲んだLaTeXをコピーしました`);
      });

      tdAction.appendChild(copyBtn);
      tdAction.appendChild(insertBtn);
      tr.appendChild(tdAction);

      resultsTableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  detectBtn.addEventListener("click", runDetection);

  let debounceTimer = null;
  inputText.addEventListener("input", () => {
    if (autoDetectCheckbox && autoDetectCheckbox.checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runDetection, 300);
    }
  });

  clearBtn.addEventListener("click", () => {
    inputText.value = "";
    runDetection();
  });

  sampleBtn1.addEventListener("click", () => {
    inputText.value = samples.sample1;
    runDetection();
  });

  sampleBtn2.addEventListener("click", () => {
    inputText.value = samples.sample2;
    runDetection();
  });

  sampleBtn3.addEventListener("click", () => {
    inputText.value = samples.sample3;
    runDetection();
  });

  if (sampleBtn4) {
    sampleBtn4.addEventListener("click", () => {
      inputText.value = samples.sample4;
      runDetection();
    });
  }

  copyAllBtn.addEventListener("click", () => {
    const text = inputText.value;
    const items = detector.detectAndConvert(text);
    if (items.length === 0) {
      showToast("コピー対象の数式がありません");
      return;
    }
    const allLatex = items.map(it => `% No.${it.id}: ${it.original} (${it.category})\n$$ ${it.latex} $$`).join("\n\n");
    copyToClipboard(allLatex, `全 ${items.length} 件のLaTeXを一括コピーしました！`);
  });

  // 辞書ビューア表示
  function renderDictionaryViewer(query = "") {
    if (!dictContainer || !MATH_DICTIONARY.namedFormulas) return;

    dictContainer.innerHTML = "";
    const filter = query.toLowerCase().trim();

    const categories = {};
    MATH_DICTIONARY.namedFormulas.forEach(item => {
      const matches = !filter || 
        item.keywords.some(k => k.toLowerCase().includes(filter)) ||
        item.category.toLowerCase().includes(filter) ||
        item.description.toLowerCase().includes(filter) ||
        item.latex.toLowerCase().includes(filter);

      if (matches) {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      }
    });

    const catKeys = Object.keys(categories);
    if (catKeys.length === 0) {
      dictContainer.innerHTML = `<div class="dict-empty">該当する公式が見つかりませんでした</div>`;
      return;
    }

    catKeys.forEach(cat => {
      const section = document.createElement("div");
      section.className = "dict-category-section";

      const catTitle = document.createElement("h4");
      catTitle.className = "dict-category-title";
      catTitle.textContent = cat;
      section.appendChild(catTitle);

      const grid = document.createElement("div");
      grid.className = "dict-card-grid";

      categories[cat].forEach(item => {
        const card = document.createElement("div");
        card.className = "dict-card";

        const header = document.createElement("div");
        header.className = "dict-card-header";
        header.innerHTML = `<strong>${escapeHtml(item.keywords[0])}</strong>`;
        card.appendChild(header);

        if (item.description) {
          const desc = document.createElement("div");
          desc.className = "dict-card-desc";
          desc.textContent = item.description;
          card.appendChild(desc);
        }

        const preview = document.createElement("div");
        preview.className = "dict-card-preview";
        try {
          if (window.katex) {
            window.katex.render(item.latex, preview, {
              displayMode: false,
              throwOnError: false
            });
          } else {
            preview.textContent = item.latex;
          }
        } catch (e) {
          preview.textContent = item.latex;
        }
        card.appendChild(preview);

        const actions = document.createElement("div");
        actions.className = "dict-card-actions";
        
        const insertBtn = document.createElement("button");
        insertBtn.className = "btn-secondary btn-xs";
        insertBtn.textContent = "入力欄に挿入";
        insertBtn.addEventListener("click", () => {
          inputText.value += (inputText.value ? "\n" : "") + item.keywords[0];
          runDetection();
          showToast(`「${item.keywords[0]}」を入力欄に挿入しました`);
        });

        const copyLatexBtn = document.createElement("button");
        copyLatexBtn.className = "btn-secondary btn-xs";
        copyLatexBtn.textContent = "LaTeXコピー";
        copyLatexBtn.addEventListener("click", () => {
          copyToClipboard(item.latex, `「${item.keywords[0]}」のLaTeXをコピーしました`);
        });

        actions.appendChild(insertBtn);
        actions.appendChild(copyLatexBtn);
        card.appendChild(actions);

        grid.appendChild(card);
      });

      section.appendChild(grid);
      dictContainer.appendChild(section);
    });
  }

  if (dictSearch) {
    dictSearch.addEventListener("input", (e) => {
      renderDictionaryViewer(e.target.value);
    });
  }

  // 初期表示: ユーザーの提示したPDFコピペサンプルを初期値として設定
  inputText.value = samples.sample4;
  runDetection();
  renderDictionaryViewer();
});
