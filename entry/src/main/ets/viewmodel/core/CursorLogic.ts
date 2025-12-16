// viewmodel/core/CursorLogic.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { StructureManager } from './strategies/StructureManager';
import hilog from '@ohos.hilog';

export class CursorLogic {

  /**
   * 计算左右移动后的光标位置
   * @param tokens Token 列表
   * @param currentIndex 当前光标位置
   * @param delta 移动方向 (-1: Left, 1: Right)
   */
  static calculateMove(tokens: FormulaToken[], currentIndex: number, delta: number): number {
    const direction = delta === -1 ? -1 : 1;

    // 1. Escape (逃逸)
    const enclosing = StructureManager.findStrategyContext(tokens, currentIndex);
    if (enclosing) {
      const exitIndex = enclosing.strategy.getExitIndex(enclosing.context, direction);
      if (exitIndex !== -1) return exitIndex;
    }

    // 2. Dive-In (潜入)
    const neighbor = StructureManager.findNeighborStrategy(tokens, currentIndex, direction);
    if (neighbor) {
      const dirStr = delta === -1 ? 'left' : 'right';
      const entrance = neighbor.strategy.getEntranceIndex(neighbor.context, dirStr);
      if (entrance !== -1) return entrance;
    }

    // 3. Normal Move
    let targetIndex = currentIndex + delta;
    let safetyCounter = 0;
    while (safetyCounter < 10) {
      if (targetIndex < 0) return 0;
      if (targetIndex > tokens.length) return tokens.length;
      if (CursorLogic.isValidPosition(tokens, targetIndex)) return targetIndex;
      targetIndex += delta;
      safetyCounter++;
    }
    return currentIndex;
  }

  /**
   * 处理上下键导航 (维度跳跃)
   * @param direction -1 (UP), 1 (DOWN)
   */
  /**
   * 处理上下键导航
   */
  static moveVertically(tokens: FormulaToken[], cursorIndex: number, direction: number): number {

    // Step 1: 优先检查左侧是否有结构 (处理光标在结构右侧外面的情况: \frac{...}{...}| )
    // direction -1 (Check Left)
    const leftNeighbor = StructureManager.findNeighborStrategy(tokens, cursorIndex, -1);

    if (leftNeighbor) {
      // 关键判定：只有当光标紧贴着 Block 的结束位置时才触发
      // StructureManager 计算的 blockEnd 指向的是 '}' 的索引。
      // 光标在 '}' 后面，所以 cursorIndex 应该是 blockEnd + 1
      if (cursorIndex === leftNeighbor.context.blockEnd + 1) {
        let result = -1;
        if (direction === -1) { // Up
          result = leftNeighbor.strategy.onMoveUp(leftNeighbor.context);
        } else { // Down
          result = leftNeighbor.strategy.onMoveDown(leftNeighbor.context);
        }
        if (result !== -1) return result;
      }
    }

    // Step 2: 检查是否在结构内部
    const enclosing = StructureManager.findStrategyContext(tokens, cursorIndex);
    if (enclosing) {
      const { strategy, context } = enclosing;
      let result = -1;
      if (direction === -1) {
        result = strategy.onMoveUp(context);
      } else {
        result = strategy.onMoveDown(context);
      }
      if (result !== -1) return result;
    }

    return cursorIndex;
  }

  // ==========================================
  // 基础辅助逻辑
  // ==========================================

  /**
   * 判断光标停在 index 处是否合法 (原子性检查)
   * 即使引入了策略模式，这个基础检查依然需要，确保普通光标移动不会破坏语法结构
   */
  /**
   * 判断光标停在 index 处是否合法 (原子性检查)
   */
  private static isValidPosition(tokens: FormulaToken[], index: number): boolean {
    if (index <= 0 || index >= tokens.length) return true;

    const prevToken = tokens[index - 1];
    const nextToken = tokens[index];

    // 1. 禁止停在 Command 和 { 之间 (e.g. \sqrt|{3}) - 原有逻辑
    if (prevToken.type === TokenType.COMMAND && nextToken.value === '{') return false;

    // 2. 禁止停在 } 和 { 之间 (e.g. }{ ) - 原有逻辑
    if (prevToken.value === '}' && nextToken.value === '{') return false;

    // --- 【新增规则】 ---

    // 3. 禁止停在 结构标记 和 { 之间 (e.g. \log_|{2}, 2^|{3})
    // 解决您最关心的 \log_|{2} 问题
    if ((prevToken.type === TokenType.STRUCT_MARKER || prevToken.value === '_' || prevToken.value === '^')
      && nextToken.value === '{') {
      return false;
    }

    // 4. 禁止停在 Command 和 ( 之间 (e.g. \sin|(x))
    // 解决您提到的 sin|(x) 问题
    if (prevToken.type === TokenType.COMMAND && nextToken.value === '(') {
      return false;
    }

    // 5. (可选) 禁止停在 Command 和 [ 之间 (e.g. \sqrt|[3])
    if (prevToken.type === TokenType.COMMAND && nextToken.value === '[') {
      return false;
    }

    // --- 【新增核心规则】禁止停在 Command 和 结构标记 之间 ---
    // 解决: \log|_{10}, \sin|^{2}, \int|_{a}
    if (prevToken.type === TokenType.COMMAND &&
      (nextToken.type === TokenType.STRUCT_MARKER || nextToken.value === '_' || nextToken.value === '^')) {
      return false;
    }

    return true;
  }
}