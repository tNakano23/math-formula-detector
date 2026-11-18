/**
 * 技術文書・PDFコピペ数式検知 & LaTeX変換アプリケーション
 * - 改行で崩れた分数・式の復元
 * - 表記号列・独立変数の自動抽出
 * - 下付き添字 / 乗算(A·B) / 上付き累乗(A^B) / 単一変数の解釈サジェスト機能
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

    const results = [];
    const usedRanges = [];

    const isOverlapping = (start, end) => {
      return usedRanges.some(r => Math.max(start, r.start) < Math.min(end, r.end));
    };

    const addResult = (original, type, category, start, end, description = "") => {
      // 4つの解釈サジェストを生成
      const suggestions = {
        subscript: this.convertRawExpressionToLatex(original, "subscript"),
        multiply: this.convertRawExpressionToLatex(original, "multiply"),
        superscript: this.convertRawExpressionToLatex(original, "superscript"),
        literal: this.convertRawExpressionToLatex(original, "literal")
      };

      results.push({
        id: results.length + 1,
        original: original.trim(),
        latex: suggestions.subscript, // デフォルト表示は下付き添字
        currentMode: "subscript",
        suggestions,
        type,
        category: category || "数式",
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
          addResult(match[1], type, "明示的数式記法", start, end);
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
          addResult(formulaBlock, "等式・算式検知", "方程式・計算式", currentStart, blockEnd);
        }

        lineOffset = nextOffset;
        i = j;
        continue;
      }

      // パターン 2-B: 表の記号列（独立行に置かれた英字・数学イタリック記号: 例 𝐶𝑊_𝐿𝐶, 𝐶𝑉𝑃_𝐿𝐶）
      if (/^[\u{1D400}-\u{1D7FF}A-Za-z0-9_]+$/u.test(trimmed)) {
        if (!isOverlapping(currentStart, currentEnd)) {
          addResult(trimmed, "表記号検知", "変数・係数記号", currentStart, currentEnd);
        }
        lineOffset += rawLine.length + 1;
        i++;
        continue;
      }

      // パターン 2-C: 「V 最大航海速力... knot」のように行頭に独立した英字変数がある場合
      const rowMatch = trimmed.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF].*)/u);
      if (rowMatch) {
        const symbol = rowMatch[1];
        const symStart = currentStart;
        const symEnd = currentStart + symbol.length;
        if (!isOverlapping(symStart, symEnd)) {
          addResult(symbol, "表記号検知", "変数・係数記号", symStart, symEnd, "表行頭の独立変数");
        }
      }

      lineOffset += rawLine.length + 1;
      i++;
    }

    // ----------------------------------------------------
    // ステップ 3: テキスト中の一般的な数式・関係式の検知
    // ----------------------------------------------------
    const mathPattern = /((?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec|max|min)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+[=<>≦≧≠≒+\-*\/×÷±∓^−]\s*(?:(?:\b(?:sin|cos|tan|log|ln|lim|sum|int|sqrt|cbrt|det|vec|max|min)\b|[0-9a-zA-Z\u03B1-\u03C9\u0391-\u03A9\u{1D400}-\u{1D7FF}_^{}\(\)\[\]|\+\-\*\/×÷±∓=<>≦≧≠≒√∫∑π・'−])\s*)+)/gu;

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
        addResult(candidate, "構文検知", "代数・関係式", start, end);
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
   * テキスト形式の数式文字列を指定モードに応じたLaTeXに変換
   * @param {string} expr 数式文字列
   * @param {string} mode 'subscript' | 'multiply' | 'superscript' | 'literal'
   * @returns {string} LaTeX表現
   */
  convertRawExpressionToLatex(expr, mode = "subscript") {
    if (!expr) return "";
    let s = expr.trim();

    s = s.replace(/^(\$\$|\$|`)+|(\$\$|\$|`)+$/g, "");

    // 1. 改行された縦並び分数の復元 (PDFコピペ対策)
    s = s.replace(/\(([^()\n]+?)\s*([+\-−*\/])\s*\n\s*([^\s()\n]+)\s*\n\s*([^\s()\n]+)\s*\n?\s*\)/gu, (match, left, op, num, den) => {
      return `(${this.convertRawExpressionToLatex(left.trim(), mode)} ${op} \\frac{${this.convertRawExpressionToLatex(num, mode)}}{${this.convertRawExpressionToLatex(den, mode)}})`;
    });

    s = s.replace(/=\s*\n\s*([^\s=\n]+)\s*\n\s*([^\s=\n]+)/gu, (match, num, den) => {
      return `= \\frac{${this.convertRawExpressionToLatex(num, mode)}}{${this.convertRawExpressionToLatex(den, mode)}}`;
    });

    s = s.replace(/\s*\n\s*/g, " ");

    // 2. ギリシャ文字・演算子の正規化
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

    // 3. 識別子（変数・添字）の解釈モード別変換
    s = s.replace(/[\u{1D400}-\u{1D7FF}A-Za-z0-9_]+/gu, (token) => {
      if (/^\d+$/.test(token)) return token;
      if (/^(sin|cos|tan|log|ln|exp|lim|sum|int|sqrt|cbrt|frac|vec|mathrm|partial)$/.test(token)) return token;
      return this.formatIdentifierWithMode(token, mode);
    });

    // 4. 関数名正規化
    s = s.replace(/\b(sin|cos|tan|log|ln|exp|max|min|det)\b(?!\s*\\)/g, "\\$1");

    // 5. 乗算記号 * の変換
    s = s.replace(/\s*\*\s*/g, " \\cdot ");

    // 6. 分数の簡易変換 (A)/(B) -> \frac{A}{B}
    let prev;
    do {
      prev = s;
      s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
    } while (s !== prev);

    s = s.replace(/([0-9a-zA-Z\\]+)\s*\/\s*([0-9a-zA-Z\\]+)/g, (match, num, den) => {
      if (num.startsWith("\\frac") || den.startsWith("\\frac")) return match;
      return `\\frac{${num}}{${den}}`;
    });

    // 7. 指数 ^ と下付き _ の括弧囲み保証
    s = s.replace(/\^([a-zA-Z0-9+\-]+)(?!})/g, "^{$1}");

    // 8. 微分記法
    s = s.replace(/d([a-zA-Z])\/d([a-zA-Z])/g, "\\frac{d$1}{d$2}");
    s = s.replace(/\\partial\s*([a-zA-Z])\/\\partial\s*([a-zA-Z])/g, "\\frac{\\partial $1}{\\partial $2}");

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
    // A. アンダースコアを含むトークン (例: CW_LC, CVP_LC, X_Y)
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

    // B. 2文字の英字・数学イタリック文字 (例: CW, CB, fT, AB, xy)
    m = id.match(/^([\u{1D400}-\u{1D7FF}A-Za-z])([\u{1D400}-\u{1D7FF}A-Za-z])$/u);
    if (m) {
      const b1 = m[1];
      const b2 = m[2];

      switch (mode) {
        case "subscript": // 下付き解釈: C_W, f_T
          return `${b1}_{${b2}}`;
        case "multiply": // 乗算解釈: C · W, A · B
          return `${b1} \\cdot ${b2}`;
        case "superscript": // 上付き累乗解釈: C^W, x^2
          return `${b1}^{${b2}}`;
        case "literal": // 通常の連名変数: \mathrm{CW}
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
        case "subscript": // x_2
          return `${letter}_{${num}}`;
        case "superscript": // x^2
          return `${letter}^{${num}}`;
        case "multiply": // x · 2
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

  // 実践的サンプルボタン群
  const sampleBtnShip = document.getElementById("sampleBtnShip");
  const sampleBtnPhysics = document.getElementById("sampleBtnPhysics");
  const sampleBtnML = document.getElementById("sampleBtnML");
  const sampleBtnMech = document.getElementById("sampleBtnMech");

  const resultsSection = document.getElementById("resultsSection");
  const resultsTableBody = document.getElementById("resultsTableBody");
  const resultCountBadge = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const copyToast = document.getElementById("copyToast");

  // 実用的なお試し例文集（PDF・論文・規格書コピペ）
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

    physics: `【流体力学 & 熱力学の仕様書コピペ例】
配管内流体のレイノルズ数 Re は代表速度 v と管径 D および動粘性係数 ν を用いて次式で定義される：
Re =
rho v D
mu
臨界レイノルズ数 Re_c ≒ 2300 において層流から乱流へ遷移する。

また、理想気体の状態方程式は圧力 P, 体積 V, 物質量 n, 温度 T に対して
P V = n R T
が成立し、密度 rho_0 と標準状態での圧力 P_0 の関係式として用いられる。`,

    ml: `【機械学習・最適化アルゴリズムの論文コピペ例】
平均二乗誤差 (MSE) による損失関数 L は、予測値 y_hat と真値 y_i の差として定義される：
L = 1/2 sum (y_i - y_hat)^2

パラメータ更新則において、学習率 alpha および勾配 ∂L/∂W を用いて重み行列 W_new を次のように逐次更新する：
W_new = W_old - alpha (∂L/∂W)
ここでバイアス項 b_1, b_2 も同様の更新式に従う。`,

    mech: `【材料力学・構造設計メモのコピペ例】
断面にかかる曲げモーメントを M, 断面係数を Z とするとき、最大曲げ応力 sigma_max は
sigma_max =
M
Z
で与えられる。
幅 b, 高さ h の長方形断面における断面二次モーメント I は
I = b h^3 / 12
であり、せん断応力 tau_max <= tau_a (許容応力) を満足しなければならない。`
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

  // サンプルボタンのイベント登録
  sampleBtnShip.addEventListener("click", () => {
    inputText.value = practicalSamples.ship;
    runDetection();
  });

  sampleBtnPhysics.addEventListener("click", () => {
    inputText.value = practicalSamples.physics;
    runDetection();
  });

  sampleBtnML.addEventListener("click", () => {
    inputText.value = practicalSamples.ml;
    runDetection();
  });

  sampleBtnMech.addEventListener("click", () => {
    inputText.value = practicalSamples.mech;
    runDetection();
  });

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
