// viewmodel/core/CursorLogic.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';

export class CursorLogic {

  /**
   * 计算移动后的光标位置
   * @param tokens 当前 Token 列表
   * @param currentIndex 当前光标位置
   * @param delta 移动方向 (-1 或 1)
   * @returns 新的光标位置
   */
  static calculateMove(tokens: FormulaToken[], currentIndex: number, delta: number): number {
    let targetIndex = currentIndex + delta;
    let safetyCounter = 0;

    // 循环跳过非法位置
    while (safetyCounter < 10) {
      // 1. 越界检查
      if (targetIndex < 0) return 0;
      if (targetIndex > tokens.length) return tokens.length;

      // 2. 检查位置是否合法
      if (CursorLogic.isValidPosition(tokens, targetIndex)) {
        return targetIndex;
      }

      // 3. 不合法，继续跳
      targetIndex += delta;
      safetyCounter++;
    }

    return currentIndex; // 如果跳不出去了，保持原样
  }

  /**
   * 判断光标位置是否合法 (static 方法，纯函数)
   */
  static isValidPosition(tokens: FormulaToken[], index: number): boolean {
    if (index <= 0 || index >= tokens.length) return true;

    const prevToken = tokens[index - 1];
    const nextToken = tokens[index];

    // 规则 1: 禁止拆散 Command 和 {
    // 场景: \sqrt | {
    if (prevToken.type === TokenType.COMMAND && nextToken.value === '{') {
      return false;
    }

    // 规则 2: 禁止拆散连续参数
    // 场景: } | {
    if (prevToken.value === '}' && nextToken.value === '{') {
      return false;
    }

    // 规则 3: 方括号处理
    // 场景: \sqrt | [
    if (prevToken.type === TokenType.COMMAND && nextToken.value === '[') return false;
    // 场景: ] | {
    if (prevToken.value === ']' && nextToken.value === '{') return false;

    return true;
  }
}