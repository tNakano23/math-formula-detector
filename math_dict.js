/**
 * 数学記号・ギリシャ文字・演算子変換トークン辞書
 * (PDFやドキュメントからコピーされた特殊記号・UnicodeをLaTeX形式に正規化)
 */

const MATH_TOKENS = {
  // ギリシャ文字
  greek: [
    { pattern: /\\?(alpha|アルファ)/gi, replace: "\\alpha" },
    { pattern: /\\?(beta|ベータ)/gi, replace: "\\beta" },
    { pattern: /\\?(gamma|ガンマ)/gi, replace: "\\gamma" },
    { pattern: /\\?(theta|シータ|テータ|θ)/gi, replace: "\\theta" },
    { pattern: /\\?(lambda|ラムダ|λ)/gi, replace: "\\lambda" },
    { pattern: /\\?(mu|ミュー|μ)/gi, replace: "\\mu" },
    { pattern: /\\?(rho|ロー|ρ)/gi, replace: "\\rho" },
    { pattern: /\\?(sigma|シグマ|σ)(?!_)/gi, replace: "\\sigma" },
    { pattern: /\\?(tau|タウ|τ)/gi, replace: "\\tau" },
    { pattern: /\\?(omega|オメガ|ω)/gi, replace: "\\omega" },
    { pattern: /\\?(pi|パイ|π)/gi, replace: "\\pi" },
    { pattern: /\\?(Delta|デルタ|Δ)/g, replace: "\\Delta" },
    { pattern: /\\?(nabla|ナブラ|∇)/g, replace: "\\nabla" }
  ],

  // 演算子・比較記号・特殊文字
  operators: [
    { pattern: /\+\-|±/g, replace: "\\pm" },
    { pattern: /\-\+|∓/g, replace: "\\mp" },
    { pattern: /×/g, replace: "\\times" },
    { pattern: /÷/g, replace: "\\div" },
    { pattern: /·|・/g, replace: "\\cdot" },
    { pattern: /<=|≦/g, replace: "\\le" },
    { pattern: />=|≧/g, replace: "\\ge" },
    { pattern: /!=|≠/g, replace: "\\neq" },
    { pattern: /≒|~=/g, replace: "\\fallingdotseq" },
    { pattern: /≈/g, replace: "\\approx" },
    { pattern: /≡/g, replace: "\\equiv" },
    { pattern: /∞|infinity|inf/gi, replace: "\\infty" },
    { pattern: /->|→/g, replace: "\\to" },
    { pattern: /∂/g, replace: "\\partial" }
  ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MATH_TOKENS;
}
