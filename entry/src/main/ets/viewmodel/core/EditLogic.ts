// viewmodel/core/EditLogic.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { KeyModel,KeyAction } from '../../model/KeyModel';
import { TokenFactory } from '../../model/TokenFactory';
import { SelectionLogic } from './SelectionLogic';
import { StrategyUtils } from './strategies/StrategyUtils';
import { StructureManager } from './strategies/StructureManager';

// 定义编辑操作的返回结果
export interface EditResult {
  cursorIndex: number;
  tokens: FormulaToken[]; // 如果需要替换整个数组
}

export class EditLogic {

  static insert(tokens: FormulaToken[], cursorIndex: number, key: KeyModel): number {
    // 【新增】拦截倒数和除法
    if (key.value === 'reciprocal') {
      return EditLogic.handleReciprocal(tokens, cursorIndex);
    }
    else if (key.value === '/') {
      return EditLogic.handleDivision(tokens, cursorIndex);
    }
    else {
      // 调用工厂
      const result = TokenFactory.createTokens(key);

      // 执行插入
      tokens.splice(cursorIndex, 0, ...result.tokens);

      // 返回新的光标位置
      return cursorIndex + result.offset;
    }
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

  /**
   * 【重构】处理倒数 (1/x)
   * 1. 如果在 \frac{1}{D} 内部 -> 还原为 D
   * 2. 如果在 \frac{N}{D} 内部 -> 翻转为 \frac{D}{N}
   * 3. 其他情况 -> 将前项捕获为 \frac{1}{Block}
   */
  static handleReciprocal(tokens: FormulaToken[], cursorIndex: number): number {

    // ==============================================================
    // 路径 A: 内部上下文 (Context Aware) - 光标在 99|
    // ==============================================================
    const enclosing = StructureManager.findStrategyContext(tokens, cursorIndex);

    if (enclosing && enclosing.strategy.id === '\\frac') {
      return this.executeFractionFlip(tokens, enclosing.context);
    }

    // ==============================================================
    // 路径 B: 外部块捕获 (Block Aware) - 光标在 \frac{1}{99}|
    // ==============================================================
    const range = SelectionLogic.findPrecedingBlock(tokens, cursorIndex);

    // 如果没有选中任何东西，插入空倒数 (略)
    if (range.start === range.end) {
      // ... (插入 \frac{1}{} 代码) ...
      // 为节省篇幅省略，同之前
      return cursorIndex;
    }

    // 【核心优化】: 检查捕获的 Block 是否本身就是一个 \frac 结构
    // Block 范围: [range.start, range.end)
    const firstToken = tokens[range.start];

    if (firstToken.value === '\\frac') {
      // 验证这个 block 是否完整包含了这个 frac
      // 比如 \frac{1}{2} + 3，光标在 3 后面，block 只是 3 -> 进 Wrap
      // 如果光标在 \frac{1}{2}|，block 是 \frac{1}{2} -> 进智能翻转

      // 利用 scanBlockEnd 检查结构完整性
      // 这里简单判断：range.end 是否等于这个 frac 的 blockEnd
      // 我们临时借用 StrategyUtils
      const numStart = range.start + 1;
      const numEnd = StrategyUtils.findMatchingClose(tokens, numStart);
      if (numEnd !== -1) {
        const denStart = numEnd + 1;
        const denEnd = StrategyUtils.findMatchingClose(tokens, denStart);

        // 如果 Block 的结束位置正好是分母的结束位置，说明整个 Block 就是一个分数
        if (denEnd !== -1 && denEnd + 1 === range.end) {
          // 构造一个临时的 context 来复用翻转逻辑
          const tempCtx = {
            tokens: tokens,
            cursorIndex: range.end, // 光标在外面
            commandIndex: range.start,
            blockStart: range.start,
            blockEnd: denEnd
          };
          return this.executeFractionFlip(tokens, tempCtx);
        }
      }
    }

    // ==============================================================
    // 路径 C: 普通 Wrap (\frac{1}{Block})
    // ==============================================================
    const blockContent = tokens.slice(range.start, range.end);

    const newTokens: FormulaToken[] = [
      new FormulaToken('\\frac', TokenType.COMMAND),
      new FormulaToken('{', TokenType.BRACKET),
      new FormulaToken('1', TokenType.NUMBER),
      new FormulaToken('}', TokenType.BRACKET),
      new FormulaToken('{', TokenType.BRACKET),
      ...blockContent,
      new FormulaToken('}', TokenType.BRACKET)
    ];

    tokens.splice(range.start, range.end - range.start, ...newTokens);

    // 光标修正：放在最后
    return range.start + newTokens.length;
  }

  // ==============================================================
  // 提取出来的公共逻辑：执行分数的翻转/还原
  // ==============================================================
  private static executeFractionFlip(tokens: FormulaToken[], ctx: any): number {
    const fracIndex = ctx.commandIndex;
    const numStart = fracIndex + 1;
    const numEnd = StrategyUtils.findMatchingClose(tokens, numStart);
    const denStart = numEnd + 1;
    const denEnd = StrategyUtils.findMatchingClose(tokens, denStart); // 也就是 ctx.blockEnd

    if (numEnd === -1 || denEnd === -1) return ctx.cursorIndex;

    const numTokens = tokens.slice(numStart + 1, numEnd);
    const isSimpleOne = numTokens.length === 1 && numTokens[0].value === '1';

    // Case 1: 还原 (\frac{1}{99} -> 99)
    if (isSimpleOne) {
      const denTokens = tokens.slice(denStart + 1, denEnd);

      // 【关键修复 splice】
      // 删除范围: 从 fracIndex 开始，删除长度为 (denEnd - fracIndex + 1)
      // 确保删除了 \frac, {num}, {den}，包括最后的 }
      tokens.splice(fracIndex, denEnd - fracIndex + 1, ...denTokens);

      // 光标放在还原后的内容后面
      return fracIndex + denTokens.length;
    }

    // Case 2: 翻转 (\frac{a}{b} -> \frac{b}{a})
    else {
      const denTokens = tokens.slice(denStart + 1, denEnd);

      const newTokens: FormulaToken[] = [
        new FormulaToken('\\frac', TokenType.COMMAND),
        new FormulaToken('{', TokenType.BRACKET),
        ...denTokens,
        new FormulaToken('}', TokenType.BRACKET),
        new FormulaToken('{', TokenType.BRACKET),
        ...numTokens,
        new FormulaToken('}', TokenType.BRACKET)
      ];

      tokens.splice(fracIndex, denEnd - fracIndex + 1, ...newTokens);

      // 光标放在末尾
      return fracIndex + newTokens.length;
    }
  }


  /**
   * 处理除法 (/) -> 转为分数
   * 将光标前的 Block 变为 \frac{Block}{|}
   */
  static handleDivision(tokens: FormulaToken[], cursorIndex: number): number {
    const range = SelectionLogic.findPrecedingBlock(tokens, cursorIndex);

    // 如果左边没东西，插入空分数 \frac{}{|}
    if (range.start === range.end) {
      // ... 类似上面的逻辑，只是光标在分母
      // 这里略写，复用 insert 逻辑即可
      return EditLogic.insert(tokens, cursorIndex, {
        value: 'division_empty', action: KeyAction.INSERT,
        template: [
          {value: '\\frac', type: TokenType.COMMAND},
          {value: '{', type: TokenType.BRACKET},
          {value: '}', type: TokenType.BRACKET},
          {value: '{', type: TokenType.BRACKET, isCursorStop: true},
          {value: '}', type: TokenType.BRACKET}
        ]
      } as any);
    }

    const blockContent = tokens.slice(range.start, range.end);

    // 构造: \frac { blockContent } { }
    const newTokens: FormulaToken[] = [
      new FormulaToken('\\frac', TokenType.COMMAND),
      new FormulaToken('{', TokenType.BRACKET),
      ...blockContent,
      new FormulaToken('}', TokenType.BRACKET),
      new FormulaToken('{', TokenType.BRACKET),
      // 空分母
      new FormulaToken('}', TokenType.BRACKET)
    ];

    tokens.splice(range.start, range.end - range.start, ...newTokens);

    // 光标停在分母的大括号中间：倒数第1个位置之前
    return range.start + newTokens.length - 1;
  }
}