// viewmodel/core/strategies/implem/FractionStrategy.ts
import { FormulaToken } from '../../../../model/FormulaToken';
import { IStructureStrategy, StrategyContext } from '../IStructureStrategy';
import { StrategyUtils } from '../StrategyUtils';

export class FractionStrategy implements IStructureStrategy {
  readonly id = '\\frac';
  onMoveUp(ctx: StrategyContext): number {
    const numEnd = this.getNumeratorEnd(ctx);

    // 情况1: 光标在整个分数【右侧】外部 (\frac{1}{99}|)
    // 此时 cursorIndex 通常是 blockEnd + 1
    if (ctx.cursorIndex > ctx.blockEnd) {
      // 目标：跳到分子末尾 \frac{1|}{99}
      // numEnd 是分子右括号 } 的索引，光标停在这里就是在 } 前面
      return numEnd;
    }

    // 情况2: 光标在分母内部
    if (this.isCursorInDenominator(ctx)) {
      // 目标：跳到分子末尾
      return numEnd;
    }
    return -1;
  }

  onMoveDown(ctx: StrategyContext): number {
    // 情况1: 光标在整个分数【右侧】外部 (\frac{1}{99}|)
    if (ctx.cursorIndex > ctx.blockEnd) {
      // 目标：跳到分母末尾 \frac{1}{99|}
      // blockEnd 是分母右括号 } 的索引，光标停在这里就是在 } 前面
      return ctx.blockEnd;
    }

    // 情况2: 光标在分子内部
    if (this.isCursorInNumerator(ctx)) {
      // 目标：跳到分母末尾
      // 修正：直接返回 blockEnd，不要减 1
      return ctx.blockEnd;
    }
    return -1;
  }

  // --- 逃逸逻辑 (左右键) ---
  getExitIndex(ctx: StrategyContext, direction: number): number {
    const numStart = ctx.commandIndex + 1; // {
    const numEnd = this.getNumeratorEnd(ctx); // }
    const denStart = numEnd + 1; // {
    const denEnd = ctx.blockEnd; // }

    // Left
    if (direction === -1) {
      // \frac{|16}{99} -> 跳出到左边
      if (ctx.cursorIndex === numStart + 1) return ctx.commandIndex;
      // \frac{16}{|99} -> 跳出到左边
      if (ctx.cursorIndex === denStart + 1) return ctx.commandIndex;
    }

    // Right
    if (direction === 1) {
      // \frac{16|}{99} -> 跳出到右边 (blockEnd + 1)
      if (ctx.cursorIndex === numEnd) return ctx.blockEnd + 1;
      // \frac{16}{99|} -> 跳出到右边 (blockEnd + 1)
      if (ctx.cursorIndex === denEnd) return ctx.blockEnd + 1;
    }

    return -1;
  }

  // --- Dive-In 逻辑 (左右键潜入) ---
  getEntranceIndex(ctx: StrategyContext, direction: 'left' | 'right'): number {
    // 从右边撞过来 (Dive-In Left) -> 进分母末尾
    if (direction === 'left') {
      return ctx.blockEnd; // 修正：直接停在 } 前面
    }
    // 从左边撞过来 (Dive-In Right) -> 进分子开头
    if (direction === 'right') {
      return ctx.commandIndex + 2; // \frac { | ...
    }
    return -1;
  }

  // --- Delete 逻辑 (保持之前的修复) ---
  onDelete(ctx: StrategyContext): { tokens: FormulaToken[], cursorIndex: number } | null {
    if (this.isCursorInDenominator(ctx)) {
      const denStart = this.getDenominatorStart(ctx);
      if (ctx.cursorIndex === denStart + 1) {
        const tokens = [...ctx.tokens];
        const numStart = ctx.commandIndex + 1;
        const numEnd = this.getNumeratorEnd(ctx);
        const denEnd = ctx.blockEnd;

        tokens.splice(denEnd, 1);           // 删分母 }
        tokens.splice(denStart, 1);         // 删分母 {
        tokens.splice(numEnd, 1);           // 删分子 }
        tokens.splice(numStart, 1);         // 删分子 {
        tokens.splice(ctx.commandIndex, 1); // 删 \frac

        // 修正光标回退位置
        return { tokens, cursorIndex: numEnd - 2 };
      }
    }
    return null;
  }

  // --- Helpers ---
  private getNumeratorEnd(ctx: StrategyContext): number {
    return StrategyUtils.findMatchingClose(ctx.tokens, ctx.commandIndex + 1);
  }

  private getDenominatorStart(ctx: StrategyContext): number {
    return this.getNumeratorEnd(ctx) + 1;
  }

  private isCursorInNumerator(ctx: StrategyContext): boolean {
    const start = ctx.commandIndex + 1;
    const end = this.getNumeratorEnd(ctx);
    return ctx.cursorIndex > start && ctx.cursorIndex <= end;
  }

  private isCursorInDenominator(ctx: StrategyContext): boolean {
    const start = this.getDenominatorStart(ctx);
    const end = ctx.blockEnd;
    return ctx.cursorIndex > start && ctx.cursorIndex <= end;
  }
}