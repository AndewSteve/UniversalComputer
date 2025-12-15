// ets/common/values/AppColors.ts

/**
 * 全局颜色常量表
 * 类似于 Flutter 的 colors.dart 或 Android 的 Color.kt
 */
export class AppColors {
  // --- 背景色 (Backgrounds) ---
  static readonly BG_DARK: string = '#2C2C2C';      // 深黑 (键盘默认)
  static readonly BG_GREY: string = '#424242';      // 深灰 (数字键)
  static readonly BG_LIGHT: string = '#F0F0F0';     // 亮灰 (浅色按钮背景)
  static readonly BG_BLUE_BTN: string = '#2D9CDB';  // 确认键/高亮键背景

  // --- 文字颜色 (Text) ---
  static readonly TEXT_WHITE: string = '#FFFFFF';
  static readonly TEXT_BLACK: string = '#1F1F1F';

  static readonly CURSOR_RED: string = '#FF0055';

  // --- 语法高亮 (Syntax Highlighting) ---
  static readonly TEXT_BLUE: string = '#5AC8FA';    // 命令/特殊符号 (\sqrt, \div)
  static readonly TEXT_YELLOW: string = '#FFD700';  // 花括号 {}

  static readonly TOKEN_BLUE: string = '#2D9CDB';
  static readonly TOKEN_BLACK: string = '#1F1F1F';
  static readonly TOKEN_GREY: string = '#424242';
  static readonly TOKEN_GREY60: string = '#757575';
  static readonly TOKEN_DARK: string = '#000000';
}