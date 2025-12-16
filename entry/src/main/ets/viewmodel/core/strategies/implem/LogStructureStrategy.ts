// viewmodel/strategy/LogStructureStrategy.ts
import { FormulaToken, TokenType } from '../../../../model/FormulaToken';
import { IStructureStrategy, StrategyContext } from '../IStructureStrategy';

export class LogStructureStrategy implements IStructureStrategy {
  readonly id = 'log';

  /**
   * 1. 进入逻辑 (Entrance)
   * 当光标位于 \log 左边按右键，或位于整个结构右边按左键时触发
   */
  getEntranceIndex(ctx: StrategyContext, direction: 'left' | 'right'): number {
    const { blockEnd, commandIndex } = ctx;

    // A. 从右向左进入 ( } <- )
    // 场景：光标在 (x) 左边，按左键 -> 跳进底数末尾 \log_{2|}
    if (direction === 'left') {
      return blockEnd;
    }

    // B. 从左向右进入 ( -> \log )
    // 场景：| \log_{2} 按右键 -> 跳进底数开头 \log_{|2}
    if (direction === 'right') {
      // 这里完全参考 IntegralStrategy 的 getLowerLimitStart
      // 直接返回 { 后面，跳过中间的 \log, _, {
      return this.getBaseContentStart(ctx);
    }

    return -1;
  }

  /**
   * 2. 逃逸逻辑 (Break-Out)
   * 当光标位于底数括号的边缘试图移出时触发
   */
  getExitIndex(ctx: StrategyContext, direction: number): number {
    const { tokens, cursorIndex, blockEnd, commandIndex } = ctx;

    // A. 向左逃逸 ( <- |num )
    // 场景：\log_{|2} 按左键 -> 直接跳到 \log 的左边 (|\log)
    if (direction === -1) {
      // 获取底数内容的起始位置 (参照积分的做法)
      const baseContentStart = this.getBaseContentStart(ctx);

      // 如果光标就在底数内容的开头 (即 { 的后面)
      if (cursorIndex === baseContentStart) {
        return commandIndex; // 直接一步跳回 Command 左侧
      }
    }

    // B. 向右逃逸 ( num| -> )
    // 场景：\log_{2|} (x) 按右键 -> 穿透进括号
    if (direction === 1) {
      if (cursorIndex === blockEnd) {
        // 预判：后面是不是跟着 (
        const nextIndex = blockEnd + 1;
        if (nextIndex < tokens.length && tokens[nextIndex].value === '(') {
          return nextIndex + 1; // 进括号
        }
        return blockEnd + 1; // 否则正常出去
      }
    }

    return -1;
  }

  /**
   * 计算底数内容的起始位置
   * 假设结构: \log _ {
   * commandIndex = \log
   * +1 = _
   * +2 = {
   * result = +3
   */
  private getBaseContentStart(ctx: StrategyContext): number {
    const { tokens, commandIndex } = ctx;

    // 防御性检查：确保结构完整
    if (commandIndex + 2 < tokens.length &&
      (tokens[commandIndex + 1].value === '_' || tokens[commandIndex + 1].type === TokenType.STRUCT_MARKER) &&
      tokens[commandIndex + 2].value === '{') {
      return commandIndex + 3;
    }

    // 如果没有底数 (比如只是 \log)，则回退到默认逻辑
    return -1;
  }

  // --- 上下移动与删除 (保持默认或简单处理) ---

  onMoveUp(ctx: StrategyContext): number {
    return -1; // Log 不支持上下导航，走默认逻辑 (跳出)
  }

  onMoveDown(ctx: StrategyContext): number {
    return -1;
  }

  onDelete(ctx: StrategyContext): { tokens: FormulaToken[], cursorIndex: number } | null {
    const { tokens, commandIndex, blockEnd } = ctx;
    const baseStart = this.getBaseContentStart(ctx);

    // 如果无法获取合法的底数起始点，不处理
    if (baseStart === -1) return null;

    // 场景：\log_{|} 按删除 -> 删除整个结构
    if (ctx.cursorIndex === baseStart && (blockEnd - baseStart) === 0) { // 空内容
      const newTokens = [...tokens];
      // 删除范围：从 commandIndex 到 blockEnd (整个 \log_{})
      newTokens.splice(commandIndex, blockEnd - commandIndex + 1);
      return { tokens: newTokens, cursorIndex: commandIndex };
    }
    return null;
  }
}