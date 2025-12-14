// model/FormulaToken.ts
import { AppColors } from "../common/values/AppColors";

export enum TokenType {
  NUMBER,     // 0-9
  COMMAND,    // \sqrt, \sin, \frac (蓝色)
  BRACKET,    // (, ), {, } (黑色/灰色)
  OPERATOR,   // +, -, *, ^ (黑色)
  VARIABLE,   // x, y (黑色斜体)
  CURSOR      // 虚拟光标
}

// 【新增】：ArkTS 必须显式定义接口，不能用 { start: number, end: number }
export interface ScopeRange {
  start: number;
  end: number;
}

export class FormulaToken {
  id: string; // 使用字符串ID更稳定
  value: string;
  type: TokenType;
  tokenColor: string | null;

  constructor(value: string, type: TokenType, tokenColor: string | null = null) {
    this.value = value;
    this.type = type;
    this.tokenColor = tokenColor
    // 简单生成唯一ID
    this.id = Math.random().toString();
  }

  getColor(): string {
    // 1. 优先使用实例特有的颜色 (比如 \div 强制蓝色)
    if (this.tokenColor) {
      return this.tokenColor;
    }

    // 2. 【核心需求】：全局规定花括号必须是黄色
    if (this.value === '{' || this.value === '}') {
      return AppColors.TEXT_YELLOW;
    }
    switch (this.type) {
      case TokenType.COMMAND: return AppColors.TOKEN_BLUE; // Maple Blue
      case TokenType.NUMBER: return AppColors.TOKEN_BLACK;
      case TokenType.OPERATOR: return AppColors.TOKEN_GREY;
      case TokenType.BRACKET: return AppColors.TOKEN_GREY60;
      case TokenType.VARIABLE: return AppColors.TOKEN_DARK;
      default: return AppColors.TOKEN_DARK;
    }
  }
}