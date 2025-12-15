// viewmodel/core/strategies/implem/IntegralStrategy.ts
import { FormulaToken, TokenType } from '../../../../model/FormulaToken';
import { IStructureStrategy, StrategyContext } from '../IStructureStrategy';
import { StrategyUtils } from '../StrategyUtils';

export class IntegralStrategy implements IStructureStrategy {
  // 注意：定积分通常结构是 \int _ {下限} ^ {上限}
  // 或者 \int ^ {上限} _ {下限}，这里我们假设标准顺序 _ { ... } ^ { ... }
  // 这个 ID 取决于你前面 Token 的 value，通常是 \int
  readonly id = '\\int';

  onMoveUp(ctx: StrategyContext): number {
    // 逻辑：下限 -> 上限
    if (this.isInLowerLimit(ctx)) {
      return this.getUpperLimitStart(ctx) + 1; // 跳到上限 { 后面
    }
    return -1;
  }

  onMoveDown(ctx: StrategyContext): number {
    // 逻辑：上限 -> 下限
    if (this.isInUpperLimit(ctx)) {
      return this.getLowerLimitStart(ctx) + 1; // 跳到下限 { 后面
    }
    return -1;
  }

  /**
   * 核心需求：当两个括号都空时，删除其中一个会删除整个积分
   */
  /**
   * 【核心重构】删除逻辑
   */
  onDelete(ctx: StrategyContext): { tokens: FormulaToken[], cursorIndex: number } | null {
    // 1. 获取关键节点索引
    const lowerStart = this.getLowerLimitStart(ctx); // _ {
    const lowerEnd = StrategyUtils.findMatchingClose(ctx.tokens, lowerStart); // }

    const upperStart = this.getUpperLimitStart(ctx); // ^ {
    const upperEnd = ctx.blockEnd; // } (即 StructureManager 扫到的结尾)

    // 安全检查
    if (lowerStart === -1 || lowerEnd === -1 || upperStart === -1) return null;

    // 2. 计算内容状态
    // 如果 Start 和 End 紧挨着，或者中间只有一个占位符(如果有占位符逻辑)，则视为空
    // 这里我们严格判断：只有 {} 紧挨着才算空
    const isLowerEmpty = (lowerEnd - lowerStart) === 1;
    const isUpperEmpty = (upperEnd - upperStart) === 1;

    // 3. 判断光标位置
    // 只有在左括号 { 的紧后面 (即内容开头) 按退格键，才触发特殊逻辑
    const atLowerStart = ctx.cursorIndex === lowerStart + 1;
    const atUpperStart = ctx.cursorIndex === upperStart + 1;

    // ----------------------------------------------------------------
    // 场景 A: 两个都为空 -> 销毁整个积分
    // ----------------------------------------------------------------
    if (isLowerEmpty && isUpperEmpty) {
      if (atLowerStart || atUpperStart) {
        const tokens = [...ctx.tokens];
        // 删除整个 \int ... } 结构
        const count = upperEnd - ctx.commandIndex + 1;
        tokens.splice(ctx.commandIndex, count);
        return { tokens, cursorIndex: ctx.commandIndex };
      }
    }

    // ----------------------------------------------------------------
    // 场景 B: 只有下限空，且光标在下限开头 -> 跳到上限【末尾】
    // (对应需求: \int_{|}^{b} -> \int_{}^{b|})
    // ----------------------------------------------------------------
    if (atLowerStart && isLowerEmpty) {
      // 这里的逻辑稍微特殊：
      // 你原本的需求是 "删除" 动作导致跳转。
      // 实际上，如果下限已经空了，再按删除，就是"此时无物可删，请求跳转"。
      // 跳转目标：UpperLimit 的内容结束位置 (即 upperEnd 之前)
      return { tokens: ctx.tokens, cursorIndex: upperEnd }; // 仅移动光标
    }

    // ----------------------------------------------------------------
    // 场景 C: 只有上限空，且光标在上限开头 -> 跳到下限【末尾】
    // (对应需求: \int_{a}^{|} -> \int_{a|}^{})
    // ----------------------------------------------------------------
    if (atUpperStart && isUpperEmpty) {
      // 跳转目标：LowerLimit 的内容结束位置 (即 lowerEnd 之前)
      return { tokens: ctx.tokens, cursorIndex: lowerEnd }; // 仅移动光标
    }

    // ----------------------------------------------------------------
    // 场景 D: 特殊情况 - 循环跳转 (Loop Navigation)
    // 即使不是空的，有些用户也习惯按退格键在 limit 之间穿梭
    // 但根据你的描述 "跑去 a/b"，这通常发生在"试图删除空限"的时候。
    // 如果你不希望非空也能跳，上面的 B/C 逻辑就够了。
    // ----------------------------------------------------------------

    return null; // 其他情况走普通删除 (删内容)
  }

  getEntranceIndex(ctx: StrategyContext, direction: 'left' | 'right'): number {
    this.debugLog("Check Entrance", ctx);
    if (direction === 'left') return ctx.blockEnd; // 进上限末尾
    if (direction === 'right') return this.getLowerLimitStart(ctx) + 1; // 进下限开头
    return -1;
  }

  getExitIndex(ctx: StrategyContext, direction: number): number {
    this.debugLog("Check Exit", ctx);
    const lowerStart = this.getLowerLimitStart(ctx);
    const lowerEnd = StrategyUtils.findMatchingClose(ctx.tokens, lowerStart);
    const upperStart = this.getUpperLimitStart(ctx);
    const upperEnd = ctx.blockEnd;

    // Left Escape
    if (direction === -1) {
      // 从下限开头出 -> \int 前
      if (ctx.cursorIndex === lowerStart + 1) return ctx.commandIndex;
      // 从上限开头出 -> 跳回下限末尾? 或者 \int 前? 通常是 \int 前
      if (ctx.cursorIndex === upperStart + 1) return lowerEnd; // 这里可以做成跳回下限
    }

    // Right Escape
    if (direction === 1) {
      // 从上限末尾出 -> 整个结构后
      if (ctx.cursorIndex === upperEnd) return upperEnd + 1;
      // 从下限末尾出 -> 进上限开头
      if (ctx.cursorIndex === lowerEnd) return upperStart + 1;
    }

    return -1;
  }

  // --- Helpers ---
  // 假设结构: \int _ { ... } ^ { ... }
  // commandIndex = \int
  // +1 = _
  // +2 = { (lowerStart)
  private getLowerLimitStart(ctx: StrategyContext): number {
    return ctx.commandIndex + 2;
  }

  private getUpperLimitStart(ctx: StrategyContext): number {
    // 找到下限的结束 }
    const lowerStart = this.getLowerLimitStart(ctx);
    const lowerEnd = StrategyUtils.findMatchingClose(ctx.tokens, lowerStart);
    // 上限结构紧跟其后: ^ {
    return lowerEnd + 2; // lowerEnd is }, +1 is ^, +2 is {
  }

  private isInLowerLimit(ctx: StrategyContext): boolean {
    const start = this.getLowerLimitStart(ctx);
    const end = StrategyUtils.findMatchingClose(ctx.tokens, start);
    return ctx.cursorIndex > start && ctx.cursorIndex <= end;
  }

  private isInUpperLimit(ctx: StrategyContext): boolean {
    const start = this.getUpperLimitStart(ctx);
    const end = ctx.blockEnd;
    return ctx.cursorIndex > start && ctx.cursorIndex <= end;
  }

  /**
   * 【调试专用】打印当前策略的完整状态
   * @param label 标签，标记是在哪个函数里调用的 (e.g., "onMoveRight")
   * @param ctx 上下文
   * @param result (可选) 预测的跳转结果索引，用于对比
   */
  private debugLog(label: string, ctx: StrategyContext, result?: number) {
    const tokens = ctx.tokens;
    const cursor = ctx.cursorIndex;

    // 1. 获取关键节点
    const cmdIdx = ctx.commandIndex;
    const lowerStart = this.getLowerLimitStart(ctx);
    const lowerEnd = StrategyUtils.findMatchingClose(tokens, lowerStart);
    const upperStart = this.getUpperLimitStart(ctx);
    const upperEnd = ctx.blockEnd;

    // 2. 生成可视化的公式预览 (带光标 |)
    // 比如: \int _ { | a } ^ { b }
    let visual = "";
    tokens.forEach((t, i) => {
      // 在当前 Token 前面插入光标
      if (i === cursor) visual += "【|】";
      visual += " " + t.value;
    });
    // 如果光标在最后
    if (cursor === tokens.length) visual += "【|】";

    // 3. 组装 Log 信息
    const info = {
      Tag: `=== [IntegralStrategy: ${label}] ===`,
      Visual: visual, // 最直观的显示
      Indices: {
        Cursor: cursor,
        Command_Int: cmdIdx,
        Lower_Start: lowerStart, // _ {
        Lower_End: lowerEnd,     // }
        Upper_Start: upperStart, // ^ {
        Upper_End: upperEnd      // }
      },
      Status: {
        In_Lower: this.isInLowerLimit(ctx),
        In_Upper: this.isInUpperLimit(ctx),
        Lower_Empty: (lowerEnd - lowerStart) === 1,
        Upper_Empty: (upperEnd - upperStart) === 1
      },
      // 如果传入了 result，显示打算跳去哪里
      Target_Jump: result !== undefined ? `${result} (Token: ${result < tokens.length ? tokens[result]?.value : 'EOF'})` : 'N/A'
    };

    // 4. 打印 (在 DevEco Studio 的 Log 面板看)
    console.info(JSON.stringify(info, null, 2));
  }
}