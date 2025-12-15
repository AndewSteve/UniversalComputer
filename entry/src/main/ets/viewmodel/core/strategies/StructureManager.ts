// viewmodel/core/strategies/StructureManager.ts
import { FormulaToken, TokenType } from '../../../model/FormulaToken';
import { IStructureStrategy, StrategyContext } from './IStructureStrategy';
import { StrategyUtils } from './StrategyUtils';

// 导入具体实现
import { FractionStrategy } from './implem/FractionStrategy';
import { PowerStrategy } from './implem/PowerStrategy';
import { IntegralStrategy } from './implem/IntegralStrategy';

export class StructureManager {
  private static strategies: Map<string, IStructureStrategy> = new Map();
  private static isInitialized = false;

  static init() {
    if (this.isInitialized) return;

    // 注册所有策略
    this.register(new FractionStrategy());
    this.register(new PowerStrategy());
    this.register(new IntegralStrategy());

    this.isInitialized = true;
  }

  static register(strategy: IStructureStrategy) {
    this.strategies.set(strategy.id, strategy);
  }

  static getStrategy(id: string): IStructureStrategy | undefined {
    if (!this.isInitialized) this.init();
    return this.strategies.get(id);
  }

  /**
   * 【核心方法】寻找当前光标所处的上下文 (用于 Up/Down/Delete)
   * 即使光标在深层嵌套中，也会找到最近的一层 Command 策略
   */
  static findStrategyContext(tokens: FormulaToken[], index: number): { strategy: IStructureStrategy, context: StrategyContext } | null {
    const scope = this.findSurroundingScope(tokens, index);
    if (!scope) return null;

    if (scope.start > 0) {
      let curr = scope.start - 1;

      // === 回溯逻辑优化 ===
      while (curr >= 0) {
        const token = tokens[curr];

        // 1. 【核心修改】如果是结构性标记 (定积分的 _ 或 ^)，直接无视，继续向前找大哥
        if (token.type === TokenType.STRUCT_MARKER) {
          curr--;
          continue;
        }

        // 2. 如果是兄弟块的结束 }，跳过整个兄弟块
        if (token.value === '}') {
          const openIndex = StrategyUtils.findMatchingOpen(tokens, curr);
          if (openIndex > 0) {
            curr = openIndex - 1;
            continue;
          }
        }

        // 3. 遇到其他东西 (Command, 或者普通的 Operator ^)
        // 这里的关键是：普通的 ^ 是 TokenType.OPERATOR，不会命中第一步的 if，会走到这里 break
        break;
      }

      if (curr >= 0) {
        const targetToken = tokens[curr];
        const strategy = this.getStrategy(targetToken.value);

        if (strategy) {
          const blockEnd = this.scanBlockEnd(tokens, curr);
          return {
            strategy,
            context: {
              tokens,
              cursorIndex: index,
              commandIndex: curr,
              blockStart: curr,
              blockEnd: blockEnd
            }
          };
        }
      }
    }
    return null;
  }

  /**
   * 【新增】寻找邻居策略 (用于左右移动时的 Dive-In)
   * @param direction -1 (Check Left) | 1 (Check Right)
   */
  static findNeighborStrategy(tokens: FormulaToken[], index: number, direction: number): { strategy: IStructureStrategy, context: StrategyContext } | null {

    // === 向左看 (光标在右侧，欲向左潜入) ===
    if (direction === -1) {
      if (index > 0 && tokens[index - 1].value === '}') {
        // 回溯找到该结构的开头 {
        const openIndex = StrategyUtils.findMatchingOpen(tokens, index - 1);
        if (openIndex > 0) {
          const commandIndex = openIndex - 1;
          const prevToken = tokens[commandIndex];

          // 检查是否有对应的策略
          const strategy = this.getStrategy(prevToken.value);
          if (strategy) {
            return {
              strategy,
              context: {
                tokens,
                cursorIndex: index,
                commandIndex: commandIndex,
                blockStart: commandIndex,
                blockEnd: index - 1 // 就是当前的 }
              }
            };
          }
        }
      }
    }
    // === 向右看 (光标在左侧，欲向右潜入) ===
    else if (direction === 1) {
      if (index < tokens.length) {
        const nextToken = tokens[index];
        // 检查是否有策略
        const strategy = this.getStrategy(nextToken.value);
        if (strategy) {
          // 向后扫描找到整个结构的结束
          const end = this.scanBlockEnd(tokens, index);
          return {
            strategy,
            context: {
              tokens,
              cursorIndex: index,
              commandIndex: index,
              blockStart: index,
              blockEnd: end
            }
          };
        }
      }
    }
    return null;
  }

  // --- Private Helpers ---

  /**
   * 扫描一个命令结构的完整结束位置
   * 例如 \frac{...}{...} 会扫描到第二个 }
   */
  private static scanBlockEnd(tokens: FormulaToken[], commandIndex: number): number {
    let curr = commandIndex + 1;
    let lastEnd = commandIndex;

    while (curr < tokens.length) {
      const token = tokens[curr];

      // 【核心修改】扫描时也跳过 STRUCT_MARKER
      if (token.type === TokenType.STRUCT_MARKER) {
        curr++;
        continue;
      }

      if (token.value === '{') {
        const end = StrategyUtils.findMatchingClose(tokens, curr);
        if (end === -1) break;
        lastEnd = end;
        curr = end + 1;
      } else {
        break;
      }
    }
    return lastEnd;
  }

  /**
   * 寻找光标所在的最小括号 Scope
   */
  private static findSurroundingScope(tokens: FormulaToken[], cursorIndex: number): { start: number, end: number } | null {
    let balance = 0;
    let start = -1;
    // 从 cursorIndex - 1 开始向左找
    for (let i = cursorIndex - 1; i >= 0; i--) {
      if (tokens[i].value === '}') balance++;
      else if (tokens[i].value === '{') {
        if (balance === 0) { start = i; break; }
        balance--;
      }
    }
    if (start === -1) return null;
    const end = StrategyUtils.findMatchingClose(tokens, start);

    // 关键：如果 cursorIndex 刚好等于 end (即光标在 } 前面)，这是合法的内部状态
    // 如果 cursorIndex > end，说明在结构外面
    if (end === -1 || cursorIndex > end) return null;

    return { start, end };
  }
}