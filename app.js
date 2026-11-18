/**
 * 技術文書・PDFコピペ数式検知 & LaTeX変換アプリケーション
 * - 改行で崩れた分数・式の復元
 * - 表記号列・独立変数の自動抽出
 * - 下付き添字 / 乗算(A·B) / 上付き累乗(A^B) / 単一変数の解釈サジェスト機能
 * - ファイル入力 (ドラッグ&ドロップ / ファイル選択)
 * - Python / Excel / 各種プログラミング言語の数式記法対応
 * - 重複検知の自動排除・優先順位統合
 */

class MathFormulaDetector {
  constructor(tokens) {
    this.tokens = tokens || {};
  }

  /**
   * 与えられたテキストから数式箇所を検知・抽出し、サジェスト候補付きでリストを返す
   * @param {string} text 入力文字列
   * @returns {Array} 検出結果オブジェクトの配列
   */
  detectAndConvert(text) {
    if (!text || typeof text !== "string") return [];

    const rawResults = [];
    const usedRanges = [];

    const isOverlapping = (start, end) => {
      return usedRanges.some(r => Math.max(start, r.start) < Math.min(end, r.end));
    };

    const addRawResult = (original, type, category, start, end, description = "", priority = 1) => {
      const trimmed = original.trim();
      if (!trimmed) return;

      rawResults.push({
        original: trimmed,
        type,
        category: category || "数式",
        description,
        range: [start, end],
        priority // 高い優先度(例: 明示的LaTeX=3, 等式ブロック=2, 構文検知=1)
      });
      usedRanges.push({ start, end });
    };

    // ----------------------------------------------------
    // ステップ 1: 明示的なLaTeX記法 ($...$, $$...$$, `...`) の検出 (優先度: 高)
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
          addRawResult(match[1], type, "明示的数式記法", start, end, "TeX/コード記法", 3);
        }
      }
    }

    // ----------------------------------------------------
    // ステップ 2: 表の記号・改行を含む等式数式ブロックの検出 (PDFコピペ対応)
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

      // パターン 2-A: 等号「=」を含む数式（改行で縦並びになった分数等を含む）
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
          addRawResult(formulaBlock, "等式・算式検知", "方程式・計算式", currentStart, blockEnd, "等式ブロック", 2);
        }

        lineOffset = nextOffset;
        i = j;
        continue;
      }

      // パターン 2-B: 表の記号列（独立行に置かれた英字・数学イタリック記号: 例 𝐶𝑊_𝐿𝐶, 𝐶𝑉𝑃_𝐿𝐶）
      if (/^[\u{1D400}-\u{1D7FF}A-Za-z0-9_]+$/u.test(trimmed)) {
        if (!isOverlapping(currentStart, currentEnd)) {
          addRawResult(trimmed, "表記号検知", "変数・係数記号", currentStart, currentEnd, "独立記号", 1);
        }
        lineOffset += rawLine.length + 1;
        i++;
        continue;
      }

      // パターン 2-C: 行頭に独立した英字変数がある場合
      const rowMatch = trimmed.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF].*)/u);
      if (rowMatch) {
        const symbol = rowMatch[1];
        const symStart = currentStart;
        const symEnd = currentStart + symbol.length;
        if (!isOverlapping(symStart, symEnd)) {
          addRawResult(symbol, "表記号検知", "変数・係数記号", symStart, symEnd, "表行頭の独立変数", 1);
        }
      }

      lineOffset += rawLine.length + 1;
      i++;
    }

    // ----------------------------------------------------
    // ステップ 3: テキスト中の一般的な数式・関係式の検知 (インテグラル・代数・関数等)
    // ----------------------------------------------------
    const mathPattern = /((?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec|max|min|abs|np|math)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+[=<>≦≧≠≒+\-*\/×÷±∓^−]\s*(?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec|max|min|abs|np|math)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+)/gu;

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
        addRawResult(candidate, "構文検知", "代数・関係式", start, end, "構文解析", 1);
      }
    }

    // ----------------------------------------------------
    // 重複・包含結果の統合とソート (ユーザーレビュー対応)
    // ----------------------------------------------------
    rawResults.sort((a, b) => {
      // 包含関係がある場合は長い方（より完全な数式）を優先
      const lenA = a.range[1] - a.range[0];
      const lenB = b.range[1] - b.range[0];
      if (a.range[0] <= b.range[0] && a.range[1] >= b.range[1]) return -1;
      if (b.range[0] <= a.range[0] && b.range[1] >= a.range[1]) return 1;
      return a.range[0] - b.range[0];
    });

    const uniqueResults = [];
    const seenLatex = new Set();

    for (const r of rawResults) {
      // 4つの解釈サジェストを生成
      const suggestions = {
        subscript: this.convertRawExpressionToLatex(r.original, "subscript"),
        multiply: this.convertRawExpressionToLatex(r.original, "multiply"),
        superscript: this.convertRawExpressionToLatex(r.original, "superscript"),
        literal: this.convertRawExpressionToLatex(r.original, "literal")
      };

      const primaryLatex = suggestions.subscript;

      // 重複除外判定: 同一LaTeX表現、または同一原文がすでに登録済みの場合はスキップ
      const dedupKey = `${r.original}:::${primaryLatex}`;
      if (seenLatex.has(dedupKey) || seenLatex.has(primaryLatex)) {
        continue;
      }
      seenLatex.add(dedupKey);
      seenLatex.add(primaryLatex);

      uniqueResults.push({
        id: uniqueResults.length + 1,
        original: r.original,
        latex: primaryLatex,
        currentMode: "subscript",
        suggestions,
        type: r.type,
        category: r.category,
        description: r.description,
        range: r.range
      });
    }

    return uniqueResults;
  }

  /**
   * テキスト形式の数式文字列を指定モードに応じたLaTeXに変換
   * @param {string} expr 数式文字列
   * @param {string} mode 'subscript' | 'multiply' | 'superscript' | 'literal'
   * @returns {string} LaTeX表現
   */
  convertRawExpressionToLatex(expr, mode = "subscript") {
    if (!expr) return "";
    let s = expr.trim();

    s = s.replace(/^(\$\$|\$|`)+|(\$\$|\$|`)+$/g, "");

    // 1. プログラミング言語・Excel記法の事前正規化
    // Pythonべき乗: x**2 -> x^2, (a+b)**2 -> (a+b)^2
    s = s.replace(/\*\*/g, "^");
    // np. / math. プレフィックスの除去: math.sqrt -> sqrt, np.sin -> sin
    s = s.replace(/\b(?:math|np|numpy)\.([a-zA-Z]+)/g, "$1");
    // abs(x) -> |x|
    s = s.replace(/\babs\(([^()]+)\)/g, "|$1|");
    // sqrt, cbrt
    s = s.replace(/\bcbrt\(([^()]+)\)/g, "\\sqrt[3]{$1}");
    s = s.replace(/\bsqrt\(([^()]+)\)/g, "\\sqrt{$1}");
    s = s.replace(/√\(([^()]+)\)/g, "\\sqrt{$1}");
    s = s.replace(/√([0-9a-zA-Z\u{1D400}-\u{1D7FF}]+)/gu, "\\sqrt{$1}");

    // 2. 改行された縦並び分数の復元 (PDFコピペ対策)
    s = s.replace(/\(([^()\n]+?)\s*([+\-−*\/])\s*\n\s*([^\s()\n]+)\s*\n\s*([^\s()\n]+)\s*\n?\s*\)/gu, (match, left, op, num, den) => {
      return `(${this.convertRawExpressionToLatex(left.trim(), mode)} ${op} \\frac{${this.convertRawExpressionToLatex(num, mode)}}{${this.convertRawExpressionToLatex(den, mode)}})`;
    });

    s = s.replace(/=\s*\n\s*([^\s=\n]+)\s*\n\s*([^\s=\n]+)/gu, (match, num, den) => {
      return `= \\frac{${this.convertRawExpressionToLatex(num, mode)}}{${this.convertRawExpressionToLatex(den, mode)}}`;
    });

    s = s.replace(/\s*\n\s*/g, " ");

    // 3. インテグラル（積分記号）の正規化
    // int_0^1 f(x) dx or ∫_0^1 f(x) dx -> \int_{0}^{1} f(x)\,dx
    s = s.replace(/(?:\\int|int|∫)(?:_\{([^}]+)\}|_([a-zA-Z0-9+\-]+))?(?:\^\{([^}]+)\}|\^([a-zA-Z0-9+\-]+))?/g, (match, subB, subS, supB, supS) => {
      const sub = subB || subS;
      const sup = supB || supS;
      if (sub && sup) return `\\int_{${sub}}^{${sup}} `;
      if (sub) return `\\int_{${sub}} `;
      if (sup) return `\\int^{${sup}} `;
      return `\\int `;
    });
    // dx, dy, dt, dz の前に \, を挿入
    s = s.replace(/(?<=[0-9a-zA-Z\)\}\]])\s*d([xyztuvw])\b/g, "\\,d$1");

    // 4. ギリシャ文字・演算子の置換
    if (this.tokens.greek) {
      for (const item of this.tokens.greek) {
        s = s.replace(item.pattern, item.replace);
      }
    }
    if (this.tokens.operators) {
      for (const item of this.tokens.operators) {
        s = s.replace(item.pattern, item.replace);
      }
    }

    // 5. 分数の簡易変換 (A)/(B) -> \frac{A}{B}
    let prev;
    do {
      prev = s;
      s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
    } while (s !== prev);

    // 単純な数値/変数の分数 a/b -> \frac{a}{b} (ただし \pm や \frac などのコマンド、または dx 等は避ける)
    s = s.replace(/(?<![\\a-zA-Z0-9])([0-9a-zA-Z\u{1D400}-\u{1D7FF}]+)\s*\/\s*([0-9a-zA-Z\u{1D400}-\u{1D7FF}]+)(?![a-zA-Z0-9])/gu, (match, num, den) => {
      if (num.startsWith("frac") || den.startsWith("frac")) return match;
      return `\\frac{${num}}{${den}}`;
    });

    // 6. トークン分解と識別子の処理（★超重要: \で始まるLaTeXコマンドは保護し \p_{m} などの誤変換を防止★）
    s = s.replace(/(\\[a-zA-Z]+)|([\u{1D400}-\u{1D7FF}A-Za-z0-9_]+)/gu, (match, latexCmd, identifier) => {
      // A. LaTeXコマンドはそのまま保護！ (\pm, \times, \alpha, \frac, \sqrt 等)
      if (latexCmd) {
        return latexCmd;
      }
      // B. 純粋な数字
      if (/^\d+$/.test(identifier)) {
        return identifier;
      }
      // C. 予約関数名
      if (/^(sin|cos|tan|log|ln|exp|lim|sum|int|sqrt|cbrt|frac|vec|mathrm|partial|max|min|det)$/.test(identifier)) {
        return `\\${identifier}`;
      }
      // D. 識別子のモード別変換
      return this.formatIdentifierWithMode(identifier, mode);
    });

    // 7. 乗算記号 * の変換
    s = s.replace(/\s*\*\s*/g, " \\cdot ");

    // 8. 指数 ^ と下付き _ の括弧囲み保証
    s = s.replace(/\^([a-zA-Z0-9+\-]+)(?!})/g, "^{$1}");

    // 9. 微分記法
    s = s.replace(/\\partial\s*([a-zA-Z])\/\\partial\s*([a-zA-Z])/g, "\\frac{\\partial $1}{\\partial $2}");

    // 10. 絶対値 |...| の美化
    s = s.replace(/\|([^|]+)\|/g, "\\left| $1 \\right|");

    // 括弧前後の空白調整
    s = s.replace(/\s*\)/g, ")");
    s = s.replace(/\(\s*/g, "(");
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  /**
   * 識別子トークンを各モードに応じて整形
   * @param {string} id 
   * @param {string} mode 'subscript' | 'multiply' | 'superscript' | 'literal'
   */
  formatIdentifierWithMode(id, mode) {
    // A. アンダースコアを含むトークン (例: CW_LC, CVP_LC, x_i, a_n)
    let m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([\u{1D400}-\u{1D7FF}A-Za-z]*)_([\u{1D400}-\u{1D7FF}A-Za-z0-9_]+)$/u);
    if (m) {
      const base = m[1];
      const part1 = m[2];
      const part2 = m[3];

      switch (mode) {
        case "subscript":
          return part1 ? `${base}_{${part1}_${part2}}` : `${base}_{${part2}}`;
        case "multiply":
          return part1 ? `${base} \\cdot ${part1}_{${part2}}` : `${base}_{${part2}}`;
        case "superscript":
          return part1 ? `${base}^{${part1}_${part2}}` : `${base}^{${part2}}`;
        case "literal":
          return `\\mathrm{${id.replace(/_/g, "\\_")}}`;
        default:
          return `${base}_{${part1 ? part1 + "_" : ""}${part2}}`;
      }
    }

    // B. 2文字の英字 (例: ax, bx, 2a, CW, CB, fT)
    // ★ユーザーレビュー対応: x, y, z, t が後ろに来る場合は係数×変数なので下付きにしない！
    m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([\u{1D400}-\u{1D7FF}A-Za-z])$/u);
    if (m) {
      const b1 = m[1];
      const b2 = m[2];

      const isVariableSuffix = /[xyztuvw]/.test(b2);
      const isBothLower = /^[a-z]{2}$/.test(id);

      if (isVariableSuffix || isBothLower) {
        // ax, bx, cx, dt, dx などは下付きにせずそのまま（乗算モード時は a \cdot x）
        if (mode === "multiply") {
          return `${b1} \\cdot ${b2}`;
        }
        return `${b1}${b2}`; // 'ax', 'bx' のまま保持
      }

      // 工学的記号（大文字+大文字 CW, CB や fT など）
      switch (mode) {
        case "subscript":
          return `${b1}_{${b2}}`;
        case "multiply":
          return `${b1} \\cdot ${b2}`;
        case "superscript":
          return `${b1}^{${b2}}`;
        case "literal":
          return `\\mathrm{${id}}`;
        default:
          return `${b1}_{${b2}}`;
      }
    }

    // C. 変数 + 単一数字 (例: x2, y1, W0)
    m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([0-9])$/u);
    if (m) {
      const letter = m[1];
      const num = m[2];

      switch (mode) {
        case "subscript":
          return `${letter}_{${num}}`;
        case "superscript":
          return `${letter}^{${num}}`;
        case "multiply":
          return `${letter} \\cdot ${num}`;
        case "literal":
          return `\\mathrm{${id}}`;
      }
    }

    // D. 3文字以上の英字連続 (例: CVP, max, Re)
    if (/^[\u{1D400}-\u{1D7FF}A-Za-z]{3,}$/u.test(id)) {
      if (mode === "literal") {
        return `\\mathrm{${id}}`;
      }
    }

    return id;
  }
}

// ==========================================
// UI インタラクション & KaTeX レンダリング
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const detector = new MathFormulaDetector(MATH_TOKENS);

  const inputText = document.getElementById("inputText");
  const detectBtn = document.getElementById("detectBtn");
  const clearBtn = document.getElementById("clearBtn");
  const autoDetectCheckbox = document.getElementById("autoDetect");

  // ファイル入力要素
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileSelectBtn = document.getElementById("fileSelectBtn");
  const fileLoadedInfo = document.getElementById("fileLoadedInfo");

  // お試し例文ボタン群
  const sampleBtnShip = document.getElementById("sampleBtnShip");
  const sampleBtnQuad = document.getElementById("sampleBtnQuad");
  const sampleBtnIntegral = document.getElementById("sampleBtnIntegral");
  const sampleBtnPython = document.getElementById("sampleBtnPython");
  const sampleBtnPhysics = document.getElementById("sampleBtnPhysics");

  const resultsSection = document.getElementById("resultsSection");
  const resultsTableBody = document.getElementById("resultsTableBody");
  const resultCountBadge = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const copyToast = document.getElementById("copyToast");

  // 実用的なお試し例文集（高校数学を排し、実践的数式・工学・プログラミング数式を提供）
  const practicalSamples = {
    ship: `記号 意味 単位
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
V 最大航海速力（1.4.3.1-7 参照） knot`,

    quad: `【代数方程式・解の公式の技術計算メモ】
2次関数の一般形:
y = ax^2 + bx + c

2次方程式の解の公式 (± と 平方根 sqrt を含む):
x = (-b ± sqrt(b^2 - 4ac))/(2a)

判別式:
D = b^2 - 4ac`,

    integral: `【微積分・解析力学の技術レポート】
定積分による定常流の総流量計算:
∫_0^1 x^2 dx = 1/3

任意区間での関数積分:
int_a^b f(x) dx

偏微分方程式 (熱伝導方程式):
∂u/∂t = alpha * (∂u/∂x)`,

    python: `【Python・NumPy・データ処理の数式コード】
多項式フィッティング:
y = a * x**2 + b * x + c

ユークリッド距離の計算:
z = math.sqrt(x**2 + y**2)

不等式・許容誤差条件:
abs(x - 1) <= 5`,

    physics: `【流体力学 & 熱力学の仕様書コピペ例】
配管内流体のレイノルズ数 Re:
Re =
rho v D
mu
臨界レイノルズ数 Re_c ≒ 2300 において層流から乱流へ遷移する。

理想気体の状態方程式:
P V = n R T`
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
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(successMsg);
    });
  }

  let currentItems = [];

  function runDetection() {
    const text = inputText.value;
    if (!text.trim()) {
      resultsTableBody.innerHTML = "";
      resultCountBadge.textContent = "0 件";
      emptyState.style.display = "block";
      resultsSection.style.display = "none";
      currentItems = [];
      return;
    }

    currentItems = detector.detectAndConvert(text);
    resultCountBadge.textContent = `${currentItems.length} 件`;

    if (currentItems.length === 0) {
      resultsTableBody.innerHTML = "";
      emptyState.style.display = "block";
      resultsSection.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    resultsSection.style.display = "block";
    renderResultsTable();
  }

  function renderResultsTable() {
    resultsTableBody.innerHTML = "";

    currentItems.forEach((item) => {
      const tr = document.createElement("tr");

      // No.
      const tdNo = document.createElement("td");
      tdNo.className = "col-no";
      tdNo.textContent = item.id;
      tr.appendChild(tdNo);

      // 分類
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

      // サジェスト切替 + LaTeXコード
      const tdLatex = document.createElement("td");
      tdLatex.className = "col-latex";

      // サジェストピルUI
      const suggestPills = document.createElement("div");
      suggestPills.className = "suggest-pill-group";

      const modes = [
        { key: "subscript", label: "🏷️ 下付き (A_B)", tip: "添字・下付き文字として解釈" },
        { key: "multiply", label: "✖️ 乗算 (A·B)", tip: "2文字の掛け算として解釈" },
        { key: "superscript", label: "🔺 上付き (A^B)", tip: "指数・累乗として解釈" },
        { key: "literal", label: "🔤 単一変数 (AB)", tip: "1つの英字単語として解釈" }
      ];

      const latexBox = document.createElement("div");
      latexBox.className = "latex-code-box";
      latexBox.textContent = item.latex;

      const previewDiv = document.createElement("div");
      previewDiv.className = "katex-rendered";
      renderLatexPreview(item.latex, previewDiv);

      modes.forEach(m => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn-suggest-pill ${item.currentMode === m.key ? "active" : ""}`;
        btn.textContent = m.label;
        btn.title = m.tip;

        btn.addEventListener("click", () => {
          item.currentMode = m.key;
          item.latex = item.suggestions[m.key];
          latexBox.textContent = item.latex;
          renderLatexPreview(item.latex, previewDiv);

          // アクティブスタイル切替
          suggestPills.querySelectorAll(".btn-suggest-pill").forEach(p => p.classList.remove("active"));
          btn.classList.add("active");
        });

        suggestPills.appendChild(btn);
      });

      tdLatex.appendChild(suggestPills);
      tdLatex.appendChild(latexBox);
      tr.appendChild(tdLatex);

      // LaTeX プレビュー
      const tdPreview = document.createElement("td");
      tdPreview.className = "col-preview";
      tdPreview.appendChild(previewDiv);
      tr.appendChild(tdPreview);

      // 操作ボタン
      const tdAction = document.createElement("td");
      tdAction.className = "col-action";

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn-secondary btn-sm";
      copyBtn.innerHTML = `📋 LaTeXコピー`;
      copyBtn.title = "現在選択中のサジェストLaTeXコードをコピー";
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

  function renderLatexPreview(latex, container) {
    try {
      if (window.katex) {
        window.katex.render(latex, container, {
          displayMode: true,
          throwOnError: false
        });
      } else {
        container.textContent = latex;
      }
    } catch (e) {
      container.innerHTML = `<span class="render-error">描画エラー: ${escapeHtml(e.message)}</span>`;
    }
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

  // ファイル読み込み処理
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      inputText.value = e.target.result;
      if (fileLoadedInfo) {
        fileLoadedInfo.textContent = `📄 読込完了: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        fileLoadedInfo.style.display = "inline-block";
      }
      showToast(`ファイル "${file.name}" を読み込みました`);
      runDetection();
    };
    reader.onerror = () => {
      showToast("ファイルの読み込みに失敗しました");
    };
    reader.readAsText(file, "UTF-8");
  }

  if (fileSelectBtn && fileInput) {
    fileSelectBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });
  }

  if (dropZone) {
    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
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
    if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
    if (fileInput) fileInput.value = "";
    runDetection();
  });

  // サンプルボタンのイベント登録
  if (sampleBtnShip) {
    sampleBtnShip.addEventListener("click", () => {
      inputText.value = practicalSamples.ship;
      if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
      runDetection();
    });
  }

  if (sampleBtnQuad) {
    sampleBtnQuad.addEventListener("click", () => {
      inputText.value = practicalSamples.quad;
      if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
      runDetection();
    });
  }

  if (sampleBtnIntegral) {
    sampleBtnIntegral.addEventListener("click", () => {
      inputText.value = practicalSamples.integral;
      if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
      runDetection();
    });
  }

  if (sampleBtnPython) {
    sampleBtnPython.addEventListener("click", () => {
      inputText.value = practicalSamples.python;
      if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
      runDetection();
    });
  }

  if (sampleBtnPhysics) {
    sampleBtnPhysics.addEventListener("click", () => {
      inputText.value = practicalSamples.physics;
      if (fileLoadedInfo) fileLoadedInfo.style.display = "none";
      runDetection();
    });
  }

  // 全LaTeX一括コピー
  copyAllBtn.addEventListener("click", () => {
    if (currentItems.length === 0) {
      showToast("コピー対象の数式がありません");
      return;
    }
    const allLatex = currentItems.map(it => `% No.${it.id}: ${it.original} (${it.category} - ${it.currentMode})\n$$ ${it.latex} $$`).join("\n\n");
    copyToClipboard(allLatex, `全 ${currentItems.length} 件のLaTeXを一括コピーしました！`);
  });

  // 初期ロード時実行（船舶規則・表コピペサンプルをセット）
  inputText.value = practicalSamples.ship;
  runDetection();
});
