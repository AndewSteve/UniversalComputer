// model/FigureConfig.ts
import { AppColors } from "../common/values/AppColors";
import { TokenType } from "./FormulaToken";
import { KeyModel, KeyAction, TemplateItem } from "./KeyModel";

// --- 辅助函数 ---
function t(value: string, type: TokenType, isCursorStop: boolean = false): TemplateItem {
  return { value, type, isCursorStop };
}

// 快速创建变体 (包含模板)
function createVariant(label: string, value: string, template: TemplateItem[]): KeyModel {
  return {
    label,
    value,
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: template
  };
}

// 快速创建函数按键 (带变体)
function createFuncKey(label: string, value: string, template: TemplateItem[], variants?: KeyModel[]): KeyModel {
  return {
    label,
    value,
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_GREY, // 函数键通常用灰色区分
    textColor: AppColors.TEXT_WHITE,
    template: template,
    variants: variants
  };
}

// ============================================================
// 符号键盘配置 (6列 x 5行)
// ============================================================
export const FIGURE_KEYS: KeyModel[] = [

  // ==========================================================
  // Row 1: 微积分核心 + 导航控制 (按需求调整)
  // [ ∫ ] [ ∑ ] [ ∏ ] [ dx ] [ 返回 ] [ ✓ ]
  // ==========================================================
  {
    label: '∫',
    value: '\\int', // 默认行为
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    insertType: TokenType.COMMAND,
    template: [
      t('\\int\\,', TokenType.COMMAND, true),
      // t('\\,', TokenType.COMMAND),         // 插入 \, 分隔符
      t('d', TokenType.VARIABLE),
      t('x', TokenType.VARIABLE)
    ],
    // 【需求】：变体要包含“本地”(本体) + 不定积分/定积分
    variants: [
      // 1. 不定积分 (本体)
      createVariant('∫', '\\int', [
        t('\\int\\,', TokenType.COMMAND, true),
        // t('\\,', TokenType.COMMAND),         // 插入 \, 分隔符
        t('d', TokenType.VARIABLE),
        t('x', TokenType.VARIABLE)
      ]),
      // 2. 定积分 (带 dx)
      createVariant('∫ₐᵇ', 'definite_integral', [
        t('\\int', TokenType.COMMAND),
        t('_', TokenType.STRUCT_MARKER),
        t('{', TokenType.BRACKET),
        t('a', TokenType.VARIABLE),
        t('}', TokenType.BRACKET),
        t('^', TokenType.STRUCT_MARKER),
        t('{', TokenType.BRACKET),
        t('b', TokenType.VARIABLE),
        t('}', TokenType.BRACKET, true),
        t('d', TokenType.VARIABLE),
        t('x', TokenType.VARIABLE)
      ])
    ]
  },
  {
    label: '∑',
    value: '\\sum',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: [
      t('\\sum', TokenType.COMMAND),
      t('_', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET, true),
      t('}', TokenType.BRACKET),
      t('^', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET),
      t('}', TokenType.BRACKET)
    ]
  },
  {
    label: '∏',
    value: '\\prod',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: [
      t('\\prod', TokenType.COMMAND),
      t('_', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET, true),
      t('}', TokenType.BRACKET),
      t('^', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET),
      t('}', TokenType.BRACKET)
    ]
  },
  {
    label: 'dx',
    value: 'dx',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: [t('d', TokenType.VARIABLE), t('x', TokenType.VARIABLE)]
  },
  // 【需求】：返回键 (第一行倒数第二个)
  {
    label: '返回',
    value: 'BACK',
    action: KeyAction.NAV_DOWN, // 逻辑在 MathKeyboard 里被拦截
    bgColor: AppColors.BG_BLUE_BTN, // 给个显眼的颜色? 或者保持深色
    textColor: AppColors.TEXT_WHITE
  },
  // 删除键放在这里 (Row 2 末尾)，因为 Row 1 满了，且比较顺手
  {
    label: '⌫',
    value: '',
    action: KeyAction.DELETE,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE
  },

  // ==========================================================
  // Row 2: 三角函数 + Limit + Delete
  // [ sin ] [ cos ] [ tan ] [ lim ] [ ! ] [ ⌫ ]
  // ==========================================================
  createFuncKey('sin', '\\sin',
    [t('\\sin', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)],
    [
      // 【需求】：变体包含本地(sin) + asin + sinh + asinh
      createVariant('sin', '\\sin', [t('\\sin', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('asin', '\\arcsin', [t('\\arcsin', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('sinh', '\\sinh', [t('\\sinh', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('asinh', 'asinh', [t('\\sinh', TokenType.COMMAND), t('^', TokenType.OPERATOR), t('{', TokenType.BRACKET), t('-', TokenType.OPERATOR), t('1', TokenType.NUMBER), t('}', TokenType.BRACKET), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])
    ]
  ),
  createFuncKey('cos', '\\cos',
    [t('\\cos', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)],
    [
      createVariant('cos', '\\cos', [t('\\cos', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('acos', '\\arccos', [t('\\arccos', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('cosh', '\\cosh', [t('\\cosh', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])
    ]
  ),
  createFuncKey('tan', '\\tan',
    [t('\\tan', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)],
    [
      createVariant('tan', '\\tan', [t('\\tan', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('atan', '\\arctan', [t('\\arctan', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)]),
      createVariant('tanh', '\\tanh', [t('\\tanh', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])
    ]
  ),
  {
    label: 'lim',
    value: '\\lim',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: [
      t('\\lim', TokenType.COMMAND),
      t('_', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET),
      t('x', TokenType.VARIABLE),
      t('\\to', TokenType.OPERATOR),
      t('}', TokenType.BRACKET, true)
    ]
  },
  {
    label: '!',
    value: '!',
    action: KeyAction.INSERT,
    insertType: TokenType.OPERATOR,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE
  },


  // ==========================================================
  // Row 3: Log, ln, 常数
  // [ ln ] [ log₂ ] [ e ] [ π ] [ ∞ ] [ |x| ]
  // ==========================================================
  createFuncKey('ln', '\\ln',
    [t('\\ln', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)],
    [
      // 变体包含自己
      createVariant('ln', '\\ln', [t('\\ln', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])
    ]
  ),
  // 【需求】：Log 本体是 log2，变体是 log10
  {
    label: 'log₂',
    value: 'log2',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_GREY,
    textColor: AppColors.TEXT_WHITE,
    template: [
      t('\\log', TokenType.COMMAND),
      t('_', TokenType.STRUCT_MARKER),
      t('{', TokenType.BRACKET),
      t('2', TokenType.NUMBER),
      t('}', TokenType.BRACKET),
      t('(', TokenType.BRACKET, true),
      t(')', TokenType.BRACKET)
    ],
    variants: [
      // 1. log2 (本地)
      createVariant('log₂', 'log2', [
        t('\\log', TokenType.COMMAND),
        t('_', TokenType.STRUCT_MARKER),
        t('{', TokenType.BRACKET),
        t('2', TokenType.NUMBER),
        t('}', TokenType.BRACKET),
        t('(', TokenType.BRACKET, true),
        t(')', TokenType.BRACKET)
      ]),
      // 2. log10
      createVariant('log₁₀', 'log10', [
        t('\\log', TokenType.COMMAND),
        t('_', TokenType.STRUCT_MARKER),
        t('{', TokenType.BRACKET),
        t('1', TokenType.NUMBER),
        t('0', TokenType.NUMBER),
        t('}', TokenType.BRACKET),
        t('(', TokenType.BRACKET, true),
        t(')', TokenType.BRACKET)
      ])
    ]
  },
  { label: 'e', value: 'e', action: KeyAction.INSERT, insertType: TokenType.VARIABLE, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: 'π', value: '\\pi', action: KeyAction.INSERT, insertType: TokenType.VARIABLE, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '∞', value: '\\infty', action: KeyAction.INSERT, insertType: TokenType.VARIABLE, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  {
    label: '|x|',
    value: 'abs',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    template: [t('|', TokenType.BRACKET), t('|', TokenType.BRACKET, true)]
  },

  // ==========================================================
  // Row 4: 其他三角函数 + 括号/Mod
  // [ cot ] [ sec ] [ csc ] [ ( ] [ ) ] [ mod ]
  // ==========================================================
  createFuncKey('cot', '\\cot', [t('\\cot', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)], [createVariant('cot', '\\cot', [t('\\cot', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])]),
  createFuncKey('sec', '\\sec', [t('\\sec', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)], [createVariant('sec', '\\sec', [t('\\sec', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])]),
  createFuncKey('csc', '\\csc', [t('\\csc', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)], [createVariant('csc', '\\csc', [t('\\csc', TokenType.COMMAND), t('(', TokenType.BRACKET, true), t(')', TokenType.BRACKET)])]),

  { label: '(', value: '(', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: ')', value: ')', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: 'mod', value: '\\mod', action: KeyAction.INSERT, template: [t('\\mod', TokenType.OPERATOR)], bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },

  // ==========================================================
  // Row 5: 括号与不等式
  // [ [ ] [ ] ] [ { ] [ } ] [ ≤ ] [ ≥ ]
  // ==========================================================
  { label: '[', value: '[', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: ']', value: ']', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '{', value: '{', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '}', value: '}', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '≤', value: '\\le', action: KeyAction.INSERT, insertType: TokenType.OPERATOR, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '≥', value: '\\ge', action: KeyAction.INSERT, insertType: TokenType.OPERATOR, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  // 【需求】：回车键 (第一行最后一个)
  {
    label: '✓',
    value: '',
    action: KeyAction.EXECUTE,
    bgColor: AppColors.BG_BLUE_BTN,
    textColor: AppColors.TEXT_WHITE
  },
];