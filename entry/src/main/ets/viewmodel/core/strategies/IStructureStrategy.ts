// viewmodel/core/strategies/IStructureStrategy.ts
import { FormulaToken } from '../../../model/FormulaToken';

/**
 * 策略执行上下文
 * 包含当前编辑器的状态以及当前所处结构的关键边界信息
 */
export interface StrategyContext {
  tokens: FormulaToken[];
  cursorIndex: number;

  // 【关键节点】
  commandIndex: number; // 命令本身的位置 (如 \frac 的索引)

  // 【结构边界】由 Manager 计算好传进来，策略直接使用
  blockStart: number;   // 结构的起始位置 (通常等于 commandIndex)
  blockEnd: number;     // 结构的结束位置 (通常是最后一个 '}')
}

export interface IStructureStrategy {
  readonly id: string;
  onMoveUp(ctx: StrategyContext): number;
  onMoveDown(ctx: StrategyContext): number;
  onDelete(ctx: StrategyContext): { tokens: FormulaToken[], cursorIndex: number } | null;
  getEntranceIndex(ctx: StrategyContext, direction: 'left' | 'right'): number;

  /**
   * 【新增】处理水平逃逸 (Break-Out)
   * 当光标在结构内部的边界（如分子开头、分母结尾）试图向外移动时触发
   * @param direction -1 (Left) | 1 (Right)
   * @returns 逃逸后的光标位置，如果不满足逃逸条件返回 -1
   */
  getExitIndex(ctx: StrategyContext, direction: number): number;
}