// viewmodel/core/strategies/StrategyUtils.ts
import { FormulaToken } from '../../../model/FormulaToken';

export class StrategyUtils {

  /**
   * 向后寻找匹配的右括号 }
   * @param tokens 列表
   * @param openIndex 左括号 { 的索引
   * @returns 右括号的索引，找不到返回 -1
   */
  static findMatchingClose(tokens: FormulaToken[], openIndex: number): number {
    const openChar = tokens[openIndex].value;
    const closeChar = this.getMatchingPair(openChar);
    if (!closeChar) return -1;

    let balance = 1;
    for (let i = openIndex + 1; i < tokens.length; i++) {
      if (tokens[i].value === openChar) balance++;
      else if (tokens[i].value === closeChar) {
        balance--;
        if (balance === 0) return i;
      }
    }
    return -1;
  }

  /**
   * 向前寻找匹配的左括号 {
   * @param tokens 列表
   * @param closeIndex 右括号 } 的索引
   * @returns 左括号的索引，找不到返回 -1
   */
  static findMatchingOpen(tokens: FormulaToken[], closeIndex: number): number {
    const closeChar = tokens[closeIndex].value;
    const openChar = this.getMatchingPair(closeChar);
    if (!openChar) return -1;

    let balance = 1;
    for (let i = closeIndex - 1; i >= 0; i--) {
      if (tokens[i].value === closeChar) balance++;
      else if (tokens[i].value === openChar) {
        balance--;
        if (balance === 0) return i;
      }
    }
    return -1;
  }

  private static getMatchingPair(char: string): string | null {
    switch (char) {
      case '{': return '}';
      case '}': return '{';
      case '[': return ']';
      case ']': return '[';
      case '(': return ')';
      case ')': return '(';
      default: return null;
    }
  }
}