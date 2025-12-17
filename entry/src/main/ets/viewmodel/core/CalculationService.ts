// viewmodel/core/CalculationService.ts
import { worker } from '@kit.ArkTS';
import { FormulaToken, TokenType } from '../../model/FormulaToken';

export class CalculationService {
  // 持有 Worker 实例
  private static mathWorker: worker.ThreadWorker | null = null;

  // 符号映射表
  private static readonly OP_MAP: Record<string, string> = {
    '\\cdot': '*', '\\times': '*', '\\div': '/',
    '+': '+', '-': '-', '^': '^', '=': '=='
  };

  // 1. 初始化 Worker
  private static initWorker() {
    if (!this.mathWorker) {
      // 确保这里的路径和 build-profile.json5 里配置的一致
      this.mathWorker = new worker.ThreadWorker("entry/ets/workers/MathWorker.ets");

      this.mathWorker.onerror = (e) => {
        console.error("[MathWorker] Error:", e.message);
      }
    }
  }

  // 2. 销毁 Worker (可选)
  static destroy() {
    if (this.mathWorker) {
      this.mathWorker.terminate();
      this.mathWorker = null;
    }
  }

  /**
   * 异步计算入口
   */
  static async evaluateAsync(tokens: FormulaToken[], isDegree: boolean): Promise<string | null> {
    // 快速过滤复杂符号（如积分），交给云端 AI
    for (const t of tokens) {
      if (t.value.includes('\\int') || t.value.includes('\\sum') || t.value.includes('\\lim')) {
        return null;
      }
    }

    // --- 核心：使用递归解析器把 Tokens 转成 MathJS 字符串 ---
    // 例如: \sin(\frac{\pi}{2}) -> sin((pi)/(2))
    const parseResult = this.parseExpr(tokens, 0, tokens.length);
    const expression = parseResult.expression;

    if (!expression || !expression.trim()) return null;

    // 启动 Worker
    this.initWorker();

    return new Promise((resolve, reject) => {
      if (!this.mathWorker) {
        resolve(null);
        return;
      }

      // 设置一次性回调
      this.mathWorker.onmessage = (e) => {
        const data = e.data as Record<string, any>;
        if (data.action === 'result') {
          // 移除监听避免内存泄漏 (简单处理，Worker在单次请求场景下通常够用)
          this.mathWorker!.onmessage = () => {};
          resolve(data.result as string);
        }
      };

      // 发送任务
      this.mathWorker.postMessage({
        action: 'calculate',
        expression: expression,
        isDegree: isDegree
      });
    });
  }

  // =========================================================================
  // 下面是【找回】的递归解析逻辑，专门处理 \frac, \sqrt, \sin 等嵌套结构
  // =========================================================================

  /**
   * 解析一段表达式
   */
  private static parseExpr(tokens: FormulaToken[], start: number, end: number): { expression: string, nextIndex: number } {
    let expr = "";
    let i = start;
    let loopCount = 0; // 死循环保险丝

    while (i < end) {
      loopCount++;
      if (loopCount > 2000) break; // 防止死循环

      const token = tokens[i];
      const val = token.value;

      // 1. 遇到需要解析的“因子”
      if (token.type === TokenType.COMMAND ||
        token.type === TokenType.NUMBER ||
        token.type === TokenType.VARIABLE ||
        val === '(' || val === '{' || val === '[') {

        const factorRes = this.parseFactor(tokens, i);

        // 隐式乘法处理 (简单版): 如果前面是数字或右括号，补个 *
        // 但 MathJS 解析器本身比较强，我们尽量保持原样，只在必要时补
        // 这里直接拼接，交给 MathJS 处理
        expr += factorRes.expression;

        // 强制索引前进
        if (factorRes.nextIndex <= i) i++;
        else i = factorRes.nextIndex;
      }
      // 2. 运算符
      else if (this.OP_MAP[val]) {
        expr += this.OP_MAP[val];
        i++;
      }
      // 3. 忽略结构标记
      else if (token.type === TokenType.STRUCT_MARKER) {
        i++;
      }
      // 4. 其他
      else {
        expr += val;
        i++;
      }
    }
    return { expression: expr, nextIndex: i };
  }

  /**
   * 解析因子 (处理 \frac, \sqrt, \sin, \pi 等)
   */
  private static parseFactor(tokens: FormulaToken[], index: number): { expression: string, nextIndex: number } {
    if (index >= tokens.length) return { expression: "", nextIndex: index };

    const token = tokens[index];
    const val = token.value;

    // --- 常量 ---
    if (val === '\\pi') return { expression: 'pi', nextIndex: index + 1 };
    if (val === 'e') return { expression: 'e', nextIndex: index + 1 };

    // --- 分数 \frac{a}{b} ---
    if (val === '\\frac') {
      const numRes = this.extractBlock(tokens, index + 1);
      const denRes = this.extractBlock(tokens, numRes.nextIndex);
      // 转成 (a)/(b)
      return {
        expression: `(${numRes.expression}) / (${denRes.expression})`,
        nextIndex: denRes.nextIndex
      };
    }

    // --- 根号 \sqrt ---
    if (val === '\\sqrt') {
      let degree = "2";
      let currentIdx = index + 1;
      // 检查 [n]
      if (currentIdx < tokens.length && tokens[currentIdx].value === '[') {
        const degreeEnd = this.findMatchingParen(tokens, currentIdx, '[', ']');
        const degreeRes = this.parseExpr(tokens, currentIdx + 1, degreeEnd);
        degree = degreeRes.expression;
        currentIdx = degreeEnd + 1;
      }
      const bodyRes = this.extractBlock(tokens, currentIdx);
      return {
        expression: `nthRoot(${bodyRes.expression}, ${degree})`,
        nextIndex: bodyRes.nextIndex
      };
    }

    // --- 函数 (sin, cos, log...) ---
    if (['\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\lg'].includes(val)) {
      let funcName = val.substring(1); // 去掉斜杠
      if (funcName === 'ln') funcName = 'log'; // mathjs 默认 log 是 ln
      if (funcName === 'lg') funcName = 'log10';

      const argRes = this.parseFactor(tokens, index + 1);
      return {
        expression: `${funcName}(${argRes.expression})`,
        nextIndex: argRes.nextIndex
      };
    }

    // --- 括号块 ---
    if (val === '(') {
      const end = this.findMatchingParen(tokens, index, '(', ')');
      const inner = this.parseExpr(tokens, index + 1, end);
      return { expression: `(${inner.expression})`, nextIndex: end + 1 };
    }
    if (val === '{') {
      // 遇到花括号，通常是参数的开始，递归解析内部
      const end = this.findMatchingParen(tokens, index, '{', '}');
      const inner = this.parseExpr(tokens, index + 1, end);
      return { expression: `(${inner.expression})`, nextIndex: end + 1 };
    }

    // --- 默认情况 ---
    return { expression: val, nextIndex: index + 1 };
  }

  // --- 辅助: 提取 {} 块 ---
  private static extractBlock(tokens: FormulaToken[], startIndex: number): { expression: string, nextIndex: number } {
    if (startIndex >= tokens.length || tokens[startIndex].value !== '{') {
      // 如果本来应该有 {} 但没有 (比如用户还没输完)，尝试解析下一个单项
      return this.parseFactor(tokens, startIndex);
    }
    const end = this.findMatchingParen(tokens, startIndex, '{', '}');
    const inner = this.parseExpr(tokens, startIndex + 1, end);
    return { expression: inner.expression, nextIndex: end + 1 };
  }

  // --- 辅助: 找匹配括号 ---
  private static findMatchingParen(tokens: FormulaToken[], start: number, openChar: string, closeChar: string): number {
    let balance = 1;
    let i = start + 1;
    while (i < tokens.length) {
      if (tokens[i].value === openChar) balance++;
      else if (tokens[i].value === closeChar) balance--;

      if (balance === 0) return i;
      i++;
    }
    return i;
  }
}