// viewmodel/core/EditLogic.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { KeyModel } from '../../model/KeyModel';
import { TokenFactory } from '../../model/TokenFactory';

// 定义编辑操作的返回结果
export interface EditResult {
  cursorIndex: number;
  tokens: FormulaToken[]; // 如果需要替换整个数组
}

export class EditLogic {

  static insert(tokens: FormulaToken[], cursorIndex: number, key: KeyModel): number {
    // 调用工厂
    const result = TokenFactory.createTokens(key);

    // 执行插入
    tokens.splice(cursorIndex, 0, ...result.tokens);

    // 返回新的光标位置
    return cursorIndex + result.offset;
  }


  static deleteRange(tokens: FormulaToken[], start: number, end: number): number {
    const count = end - start;
    tokens.splice(start, count);
    return start; // 光标回到起点
  }

  /**
   * 智能退格逻辑 (Maple 风格)
   */
  static backspace(tokens: FormulaToken[], cursorIndex: number): number {
    if (cursorIndex <= 0) return 0;

    const prevIndex = cursorIndex - 1;
    const prevToken = tokens[prevIndex];

    // ============================================================
    // 1. Dive-In (潜入模式)
    // 遇到右括号，跳进去，而不是删除它
    // 场景: \frac{1}{99}| -> backspace -> \frac{1}{9|9} (这里逻辑是跳到9后，再按一次删9)
    // 场景: \frac{1}{99}| -> backspace -> \frac{1}{99|} (进入分母末尾)
    // ============================================================
    if (prevToken.value === '}' || prevToken.value === ']') {
      return prevIndex; // 仅移动光标，不删除
      // return EditLogic.backspace(tokens,prevIndex); // 仅移动光标，不删除
    }

    // ============================================================
    // 2. Structural Deletion (结构性删除)
    // 遇到左括号，说明撞到了墙，需要判断是“拆墙”还是“被墙挡住”
    // ============================================================
    if (prevToken.value === '{' || prevToken.value === '[') {
      return EditLogic.handleStructuralDeletion(tokens, cursorIndex);
    }

    // ============================================================
    // 3. 普通删除
    // ============================================================
    tokens.splice(prevIndex, 1);
    return prevIndex;
  }

  /**
   * 处理结构性删除的核心逻辑
   */
  private static handleStructuralDeletion(tokens: FormulaToken[], cursorIndex: number): number {
    const openBracketIndex = cursorIndex - 1; // '{' 的位置

    // 异常保护
    if (openBracketIndex < 1) {
      tokens.splice(openBracketIndex, 1);
      return openBracketIndex;
    }

    const prevToken = tokens[openBracketIndex - 1];

    // -------------------------------------------------------------
    // 情况 A: 分数特殊处理 (\frac)
    // -------------------------------------------------------------

    // A1. 光标在【分子】开头: \frac{|}{99}
    if (prevToken.value === '\\frac') {
      // 检查分母是否为空
      // 找到分子的结束 }
      const numEndIndex = EditLogic.findMatchingCloseBracket(tokens, openBracketIndex);
      // 找到分母的开始 {
      const denStartIndex = numEndIndex + 1;
      // 找到分母的结束 }
      const denEndIndex = EditLogic.findMatchingCloseBracket(tokens, denStartIndex);

      const isDenominatorEmpty = (denEndIndex - denStartIndex) === 1; // 只有 {} 紧挨着

      if (!isDenominatorEmpty) {
        // 用户要求: "66\frac{|}{99}" -> 保持原样 (Block Deletion)
        // 只有当分母也为空时 (\frac{|}{|})，才允许删除整个分数
        return cursorIndex;
      }

      // 如果分母为空，允许销毁整个分数，进入下面的通用删除逻辑
    }

    // A2. 光标在【分母】开头: \frac{99}{|}
    // 此时 prevToken 是分子的右括号 '}'
    if (prevToken.value === '}') {
      // 回溯检查这是否是 \frac 的结构
      const numStartIndex = EditLogic.findMatchingOpenBracket(tokens, openBracketIndex - 1);
      if (numStartIndex > 0 && tokens[numStartIndex - 1].value === '\\frac') {
        // 确认是分数分母开头
        // 行为: 保留分子，销毁分母，销毁 \frac
        // 变换: \frac{99}{|} -> 99

        // 1. 删除分母的闭合 } (如果有的话)
        const denEndIndex = EditLogic.findMatchingCloseBracket(tokens, openBracketIndex);
        if (denEndIndex !== -1) tokens.splice(denEndIndex, 1);

        // 2. 删除分母的开头 { (当前位置)
        tokens.splice(openBracketIndex, 1);

        // 3. 删除分子的闭合 }
        tokens.splice(openBracketIndex - 1, 1);

        // 4. 删除分子的开头 {
        tokens.splice(numStartIndex, 1);

        // 5. 删除 \frac
        tokens.splice(numStartIndex - 1, 1);

        // 光标移动到分子末尾
        // 原 index 为 openBracketIndex (分母{), 前面删除了 (\frac, Num{, Num}) 3个 token
        return openBracketIndex - 3;
      }
    }

    // -------------------------------------------------------------
    // 情况 B: 通用单容器解包 (\sqrt, ^, \text, 以及空的 \frac)
    // 行为: 脱掉壳子，保留内容
    // 例子: \sqrt{|66} -> 66
    // 例子: 99^{|2} -> 992
    // -------------------------------------------------------------
    if (prevToken.type === TokenType.COMMAND || prevToken.type === TokenType.OPERATOR) {
      // 1. 找到匹配的右括号 }
      const closeBracketIndex = EditLogic.findMatchingCloseBracket(tokens, openBracketIndex);

      // 2. 删除右括号 }
      if (closeBracketIndex !== -1) {
        tokens.splice(closeBracketIndex, 1);
      }

      // 3. 删除左括号 {
      tokens.splice(openBracketIndex, 1);

      // 4. 删除 Command (\sqrt 或 ^)
      tokens.splice(openBracketIndex - 1, 1);

      // 光标回退 1 格
      return openBracketIndex - 1;
    }

    // 默认: 只是删掉孤立的 { (防错)
    tokens.splice(openBracketIndex, 1);
    return openBracketIndex;
  }

  // --- 辅助方法 ---
  private static findMatchingCloseBracket(tokens: FormulaToken[], openIndex: number): number {
    let balance = 1;
    for (let i = openIndex + 1; i < tokens.length; i++) {
      if (tokens[i].value === '{') balance++;
      else if (tokens[i].value === '}') {
        balance--;
        if (balance === 0) return i;
      }
    }
    return -1;
  }

  private static findMatchingOpenBracket(tokens: FormulaToken[], closeIndex: number): number {
    let balance = 1;
    for (let i = closeIndex - 1; i >= 0; i--) {
      if (tokens[i].value === '}') balance++;
      else if (tokens[i].value === '{') {
        balance--;
        if (balance === 0) return i;
      }
    }
    return -1;
  }
}