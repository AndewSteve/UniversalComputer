// ============================================================
// 3. 键位布局数据
import { AppColors } from "../common/values/AppColors";
import { TokenType } from "./FormulaToken";
import { KeyModel,KeyAction, TemplateItem } from "./KeyModel";

// 辅助函数：快速创建变体 (继承父级样式，但允许覆盖)
function createVariant(
  label: string,
  value: string,
  type: TokenType,
  customColor?: string
): KeyModel {
  return {
    label,
    value,
    action: KeyAction.INSERT,
    insertType: type,
    bgColor: AppColors.BG_DARK, // 变体弹窗通常是深色背景
    textColor: customColor || AppColors.TEXT_WHITE // 默认白字，可覆盖
  };
}

// 辅助函数：快速创建模板项
function t(value: string, type: TokenType, isCursorStop: boolean = false): TemplateItem {
  return { value, type, isCursorStop };
}



// ============================================================
export const MAPLE_KEYS: KeyModel[] = [
  // --- Row 1 ---
  {
    label: '÷',
    value: '/', // 逻辑上我们用 / 代表构造分数
    action: KeyAction.INSERT,
    // 不再作为 OPERATOR 插入，而是触发 EditLogic.division
    template: [], // 清空模板，交由逻辑处理
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE
  },
  {
    label: '×',
    value: '\\cdot', // 【修改】: 默认使用点乘
    action: KeyAction.INSERT,
    insertType: TokenType.OPERATOR,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE, // 按钮是白色
    insertColor: AppColors.TEXT_BLUE // 【配置】：插入公式后是蓝色
  },
  { label: '−', value: '-', action: KeyAction.INSERT, insertType: TokenType.OPERATOR, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '+', value: '+', action: KeyAction.INSERT, insertType: TokenType.OPERATOR, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  {
    label: '^',
    value: '^',
    action: KeyAction.INSERT,
    // ^ 按钮本身
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    // 模板
    template: [
      t('^', TokenType.OPERATOR),
      t('{', TokenType.BRACKET, true),
      t('}', TokenType.BRACKET)
    ]
  },
  { label: '⌫', value: '', action: KeyAction.DELETE, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },

  // --- Row 2 ---
  { label: '7', value: '7', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '8', value: '8', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '9', value: '9', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  {
    label: '√x',
    value: '\\sqrt',
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_BLUE,
    // 【配置】：根号的插入行为
    template: [
      t('\\sqrt', TokenType.COMMAND),
      t('{', TokenType.BRACKET, true), // 光标停在 { 后面
      t('}', TokenType.BRACKET)
    ],
    variants: [
      {
        label: '∛', value: '\\sqrt[3]', action: KeyAction.INSERT, bgColor: AppColors.BG_DARK,
        // 立方根的模板
        template: [
          t('\\sqrt', TokenType.COMMAND),
          t('[', TokenType.BRACKET),
          t('3', TokenType.NUMBER),
          t(']', TokenType.BRACKET),
          t('{', TokenType.BRACKET, true), // 光标在这里
          t('}', TokenType.BRACKET)
        ]
      }
    ]
  },
  { label: '(', value: '(', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: ')', value: ')', action: KeyAction.INSERT, insertType: TokenType.BRACKET, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },

  // --- Row 3 ---
  { label: '4', value: '4', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '5', value: '5', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '6', value: '6', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },

  // 【修改】：x, y, z 用 蓝色文字。
  {
    label: 'x',
    value: 'x',
    action: KeyAction.INSERT,
    insertType: TokenType.VARIABLE,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE, // 白字
    variants: [
      createVariant('x', 'x', TokenType.VARIABLE, AppColors.TEXT_WHITE), // 弹窗里背景是黑的，所以这里用白字或者保持对比度
      createVariant('y', 'y', TokenType.VARIABLE, AppColors.TEXT_WHITE),
      createVariant('z', 'z', TokenType.VARIABLE, AppColors.TEXT_WHITE),
      createVariant('θ', '\\theta', TokenType.VARIABLE, AppColors.TEXT_BLUE) // 【修改】：theta 用蓝色
    ]
  },

  { label: '↑', value: 'UP', action: KeyAction.NAV_UP, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE }, // 需在 KeyAction 加 NAV_UP
  {
    label: '1/x',
    value: 'reciprocal', // 这是一个特殊标记
    action: KeyAction.INSERT,
    bgColor: AppColors.BG_DARK,
    textColor: AppColors.TEXT_WHITE,
    // 【配置】：分式的插入行为 (完全数据化，不再写死在 Factory 里)
    template: [
      t('\\frac', TokenType.COMMAND),
      t('{', TokenType.BRACKET),
      t('1', TokenType.NUMBER),
      t('}', TokenType.BRACKET),
      t('{', TokenType.BRACKET, true), // 光标停在分母的 { 后面
      t('}', TokenType.BRACKET)
    ]
  },

  // --- Row 4 ---
  { label: '1', value: '1', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '2', value: '2', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '3', value: '3', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '←', value: '', action: KeyAction.NAV_LEFT, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '⊙', value: '', action: KeyAction.SELECT_EXPAND, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '→', value: '', action: KeyAction.NAV_RIGHT, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },

  // --- Row 5 ---
  { label: '0', value: '0', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: '.', value: '.', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_GREY, textColor: AppColors.TEXT_WHITE },
  { label: ',', value: ',', action: KeyAction.INSERT, insertType: TokenType.NUMBER, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '=', value: '=', action: KeyAction.EXECUTE, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE },
  { label: '↓', value: 'DOWN', action: KeyAction.NAV_DOWN, bgColor: AppColors.BG_DARK, textColor: AppColors.TEXT_WHITE }, // 需在 KeyAction 加 NAV_DOWN
  { label: '✓', value: '', action: KeyAction.EXECUTE, bgColor: AppColors.BG_BLUE_BTN, textColor: AppColors.TEXT_WHITE },
];