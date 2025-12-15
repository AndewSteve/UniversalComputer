// viewmodel/core/strategies/implem/PowerStrategy.ts
import { FormulaToken } from '../../../../model/FormulaToken';
import { IStructureStrategy, StrategyContext } from '../IStructureStrategy';
import { StrategyUtils } from '../StrategyUtils';

export class PowerStrategy implements IStructureStrategy {
  readonly id = '^';

  onMoveUp(ctx: StrategyContext): number {
    // 已经在顶层，不做处理
    return -1;
  }

  onMoveDown(ctx: StrategyContext): number {
    // 下键：落地 (跳出结构)
    // 逻辑：直接跳到 blockEnd (}) 的后面
    if (ctx.cursorIndex <= ctx.blockEnd) {
      return ctx.blockEnd + 1;
    }
    return -1;
  }

  onDelete(ctx: StrategyContext): { tokens: FormulaToken[], cursorIndex: number } | null {
    // 解构逻辑: 9^{|2} -> 92
    const openIndex = ctx.commandIndex + 1;

    if (ctx.cursorIndex === openIndex + 1) {
      const tokens = [...ctx.tokens];
      const closeIndex = ctx.blockEnd;

      // 倒序删除
      tokens.splice(closeIndex, 1); // 删 }
      tokens.splice(openIndex, 1);  // 删 {
      tokens.splice(ctx.commandIndex, 1); // 删 ^

      return { tokens, cursorIndex: ctx.commandIndex };
    }
    return null;
  }

  getEntranceIndex(ctx: StrategyContext, direction: 'left' | 'right'): number {
    // 从右边撞过来 (Dive-In Left) -> 进指数末尾
    if (direction === 'left') {
      return ctx.blockEnd;
    }
    // 从左边撞过来 (Dive-In Right) -> 进指数开头
    if (direction === 'right') {
      return ctx.commandIndex + 2;
    }
    return -1;
  }

  /**
   * 【核心修复】处理逃逸逻辑
   * 防止光标停留在 ^ 和 { 之间导致渲染错误
   */
  getExitIndex(ctx: StrategyContext, direction: number): number {
    // 1. 向左 (Left)
    if (direction === -1) {
      // 场景: ^{|9} -> 跳到 ^ 前面
      // 指数开始位置: commandIndex + 1 是 '{'
      // 光标在 '{' 后面即 commandIndex + 2
      if (ctx.cursorIndex === ctx.commandIndex + 2) {
        return ctx.commandIndex; // 直接跳到 ^ 前面，即 (...) | ^{...}
      }
    }

    // 2. 向右 (Right)
    if (direction === 1) {
      // 场景: ^{9|} -> 跳到 } 后面
      // ctx.blockEnd 是 '}' 的位置
      // 光标在 '}' 前面即 blockEnd
      if (ctx.cursorIndex === ctx.blockEnd) {
        return ctx.blockEnd + 1;
      }
    }

    return -1;
  }
}