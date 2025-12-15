import { FormulaToken, TokenType, ScopeRange } from '../../model/FormulaToken';
import { StrategyUtils } from './strategies/StrategyUtils';

export class SelectionLogic {

  /**
   * 计算智能扩展后的选区范围
   * @param tokens Token 列表
   * @param cursorIndex 当前光标位置
   * @param currentStart 当前选区起点 (-1 表示无)
   * @param currentEnd 当前选区终点 (-1 表示无)
   * @returns 新的选区范围 {start, end}
   */
  static expandSelection(
    tokens: FormulaToken[],
    cursorIndex: number,
    currentStart: number,
    currentEnd: number
  ): ScopeRange {

    // 0. 如果已经全选，则取消选择
    if (currentStart === 0 && currentEnd === tokens.length) {
      return { start: -1, end: -1 };
    }

    let newStart = -1;
    let newEnd = -1;
    const hasSelection = (currentStart !== -1 && currentEnd !== -1);

    if (!hasSelection) {
      // 1. 初始状态：无选区 -> 选中光标所在的最小 Scope
      const scope = SelectionLogic.findInnerScope(tokens, cursorIndex);
      newStart = scope.start;
      newEnd = scope.end;

      // 如果 scope 是空的（比如光标在最外层，且没有括号包裹），
      // 或者是光标卡在两个 token 中间，尝试选中光标前的一个 Token 作为起步
      if (newStart === newEnd) {
        if (cursorIndex > 0) {
          newStart = cursorIndex - 1;
          newEnd = cursorIndex;
        } else if (tokens.length > 0) {
          // 如果在最前面，选中第一个
          newStart = 0;
          newEnd = 1;
        } else {
          // 啥都没有
          return { start: -1, end: -1 };
        }
      }
    } else {
      // 2. 已有选区：向外扩展 (Smart Expand)

      // A. 检查当前选区是否被 Command 包裹 (e.g. \sqrt { [selection] } )
      // 如果是，扩展到包含 Command
      const cmdWrapper = SelectionLogic.findCommandBlockWrapping(tokens, currentStart, currentEnd);
      if (cmdWrapper) {
        newStart = cmdWrapper.start;
        newEnd = cmdWrapper.end;
      }
      else {
        // B. 如果不是被 Command 包裹，或者是单纯的括号层级
        // 尝试扩展到外层 Scope (e.g. { a + b } -> 扩展选中 { a + b })
        // 我们用选区的起点去探查外层 Scope
        const outerScope = SelectionLogic.findInnerScope(tokens, currentStart);

        // 如果外层 scope 比当前选区大，就扩展到 scope
        if (outerScope.start < currentStart || outerScope.end > currentEnd) {
          newStart = outerScope.start;
          newEnd = outerScope.end;
        } else {
          // C. 已经在这个 Scope 极限了，或者已经是 Top Level，全选
          newStart = 0;
          newEnd = tokens.length;
        }
      }
    }

    return { start: newStart, end: newEnd };
  }

  // ==========================================
  // 辅助算法
  // ==========================================

  /**
   * 寻找 index 所在的最小括号范围 (start, end)
   * 这里的范围指的是括号内的内容，不包含括号本身
   */
  private static findInnerScope(tokens: FormulaToken[], index: number): ScopeRange {
    let start = 0;
    let end = tokens.length;

    let balance = 0;

    // 向左找最近的未闭合 {
    for (let i = index - 1; i >= 0; i--) {
      if (tokens[i].value === '}') balance++;
      if (tokens[i].value === '{') {
        if (balance === 0) {
          start = i + 1; // 内容开始于 { 后面
          break;
        }
        balance--;
      }
    }

    balance = 0;
    // 向右找匹配的 }
    for (let i = index; i < tokens.length; i++) {
      if (tokens[i].value === '{') balance++;
      if (tokens[i].value === '}') {
        if (balance === 0) {
          end = i; // 内容结束于 } 前面
          break;
        }
        balance--;
      }
    }

    return { start, end };
  }

  /**
   * 检查范围 [s, e] 是否紧挨着被 Command + {} 包裹
   * 例如: \sqrt { [s...e] }
   * 返回包含 \sqrt 和 {} 的大范围
   */
  private static findCommandBlockWrapping(tokens: FormulaToken[], s: number, e: number): ScopeRange | null {
    // 预期结构: [Command] [{] [s...e] [}]
    // s 指向选区开头，e 指向选区结尾（开区间，即 } 的位置）

    // 检查边界：s的前面应该是 {，e应该是 }
    // 也就是 tokens[s-1] === '{', tokens[e] === '}'
    if (s > 1 && e < tokens.length) {
      const prevChar = tokens[s - 1];
      const nextChar = tokens[e];
      const prevPrevChar = tokens[s - 2];

      if (prevChar.value === '{' && nextChar.value === '}' && prevPrevChar.type === TokenType.COMMAND) {
        // 选中范围包括 Command, {, 内容, }
        // Start: s-2 (Command的位置)
        // End: e+1 (} 的后面)
        return { start: s - 2, end: e + 1 };
      }
    }
    return null;
  }

  /**
   * 寻找光标左侧的逻辑单元 (Preceding Block)
   * 用于倒数、除法等操作
   * @returns ScopeRange: {start, end}，如果没有则返回 start=end=cursor
   */
  static findPrecedingBlock(tokens: FormulaToken[], cursorIndex: number): ScopeRange {
    if (cursorIndex === 0) return { start: 0, end: 0 };

    let start = cursorIndex - 1;
    const prevToken = tokens[start];

    // 1. 如果是右括号 } 或 ] 或 ) 【新增 )】
    if (prevToken.value === '}' || prevToken.value === ']' || prevToken.value === ')') {
      // 找到匹配的左括号
      const openIndex = StrategyUtils.findMatchingOpen(tokens, start);

      if (openIndex !== -1) {
        start = openIndex;

        // 回溯检查 (只针对 })
        if (prevToken.value === '}' && start > 0 && tokens[start - 1].value === '}') {
          // ... (保持原来的 \frac 回溯逻辑) ...
          const firstArgOpen = StrategyUtils.findMatchingOpen(tokens, start - 1);
          if (firstArgOpen > 0) {
            const possibleCmd = tokens[firstArgOpen - 1];
            if (possibleCmd.value === '\\frac') {
              start = firstArgOpen;
            }
          }
        }

        // 检查前面是否有 Command
        if (start > 0) {
          const possibleCmd = tokens[start - 1];
          // 注意：通常 (33) 前面没有 Command，除非是 \sin(33)。
          // 如果是 \sin(33)，我们希望倒数变成 \frac{1}{\sin(33)}，所以这里包含 Command 是对的。
          if (possibleCmd.type === TokenType.COMMAND || possibleCmd.type === TokenType.OPERATOR) {
            start--;
          }
        }
      }
    }
    // 2. 数字连续捕获
    else if (prevToken.type === TokenType.NUMBER) {
      while (start > 0 && tokens[start - 1].type === TokenType.NUMBER) {
        start--;
      }
    }

    return { start, end: cursorIndex };
  }

  // 复用或移动 findMatchingOpenBracket 到这里作为 public/private static
  public static findMatchingOpenBracket(tokens: FormulaToken[], closeIndex: number): number {
    let balance = 1;
    for (let i = closeIndex - 1; i >= 0; i--) {
      if (tokens[i].value === '}' || tokens[i].value === ']') balance++;
      else if (tokens[i].value === '{' || tokens[i].value === '[') {
        balance--;
        if (balance === 0) return i;
      }
    }
    return -1;
  }
}