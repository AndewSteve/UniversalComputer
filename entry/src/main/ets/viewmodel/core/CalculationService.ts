// viewmodel/core/CalculationService.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { evaluate, create, all } from 'mathjs';

const math = create(all, {
  number: 'BigNumber',
  precision: 64
});

export class CalculationService {

  private static readonly COMPLEX_SYMBOLS = [
    '\\int', '\\sum', '\\lim', '\\prod', 'd', 'dx'
  ];

  private static readonly OP_MAP: Record<string, string> = {
    '\\cdot': '*', '\\times': '*', '\\div': '/',
    '+': '+', '-': '-', '^': '^', '=': '=='
  };

  static evaluateRealTime(tokens: FormulaToken[], isDegree: boolean): string | null {
    console.info(`[MathDebug] Input: ${tokens.map(t => t.value).join(' ')}`);

    for (const t of tokens) {
      if (this.COMPLEX_SYMBOLS.includes(t.value)) return null;
    }

    try {
      // 1. 解析生成表达式
      const { expression } = this.parseExpr(tokens, 0, tokens.length);
      console.info(`[MathDebug] Generated: "${expression}"`);

      if (!expression.trim()) return null;

      // 2. 作用域
      const scope = {
        sin: (x: any) => isDegree ? math.sin(math.unit(x, 'deg')) : math.sin(x),
        cos: (x: any) => isDegree ? math.cos(math.unit(x, 'deg')) : math.cos(x),
        tan: (x: any) => isDegree ? math.tan(math.unit(x, 'deg')) : math.tan(x),

        asin: (x: any) => isDegree ? math.unit(math.asin(x), 'rad').toNumber('deg') : math.asin(x),
        acos: (x: any) => isDegree ? math.unit(math.acos(x), 'rad').toNumber('deg') : math.acos(x),
        atan: (x: any) => isDegree ? math.unit(math.atan(x), 'rad').toNumber('deg') : math.atan(x),

        sinh: math.sinh, cosh: math.cosh, tanh: math.tanh,
        asinh: math.asinh, acosh: math.acosh, atanh: math.atanh,

        // 现在只需要标准 log
        log: math.log,   // log(x, base) 或 ln(x)
        log10: math.log10,

        pi: math.pi, e: math.e
      };

      const result = math.evaluate(expression, scope);
      const resStr = this.formatResult(result);
      console.info(`[MathDebug] Result: ${resStr}`);
      return resStr;
    } catch (e) {
      console.warn(`[MathDebug] Error: ${e.message}`);
      return null;
    }
  }

  /**
   * 解析一段表达式 (Expression)
   * 处理加减乘除连接的逻辑
   */
  private static parseExpr(tokens: FormulaToken[], start: number, end: number): { expression: string, nextIndex: number } {
    let expr = "";
    let i = start;

    while (i < end) {
      const token = tokens[i];
      const val = token.value;

      // 1. 遇到函数/命令 -> 转交给 parseFactor 处理原子单位
      //    (包括 \log, \sin, \frac, \sqrt, 数字, 变量, 括号块)
      if (token.type === TokenType.COMMAND ||
        token.type === TokenType.NUMBER ||
        token.type === TokenType.VARIABLE ||
        val === '(' || val === '{') {

        // 调用 parseFactor 提取一个完整的“因子”
        const factorRes = this.parseFactor(tokens, i);
        expr += factorRes.expression;
        i = factorRes.nextIndex;
      }
      // 2. 遇到运算符 -> 直接拼接
      else if (this.OP_MAP[val]) {
        expr += this.OP_MAP[val];
        i++;
      }
      // 3. 忽略结构标记 (只在 parseFactor 内部被消费)
      else if (token.type === TokenType.STRUCT_MARKER) {
        i++;
      }
      // 4. 其他 (如右括号)
      else {
        expr += val;
        i++;
      }
    }
    return { expression: expr, nextIndex: i };
  }

  /**
   * 【核心】解析一个“因子” (Factor)
   * 一个因子可以是一个数字、一个括号块、或者一个带参数的函数调用
   * 比如: "9", "(1+2)", "sin(x)", "log(9, 2)"
   */
  private static parseFactor(tokens: FormulaToken[], index: number): { expression: string, nextIndex: number } {
    if (index >= tokens.length) return { expression: "", nextIndex: index };

    const token = tokens[index];
    const val = token.value;

    // --- Case A: 分数 \frac{a}{b} ---
    if (val === '\\frac') {
      const numRes = this.extractBlock(tokens, index + 1);
      const denRes = this.extractBlock(tokens, numRes.nextIndex);
      return {
        expression: `(${numRes.expression}) / (${denRes.expression})`,
        nextIndex: denRes.nextIndex
      };
    }

    // --- Case B: 根号 \sqrt{x} ---
    if (val === '\\sqrt') {
      const bodyRes = this.extractBlock(tokens, index + 1);
      return {
        expression: `sqrt(${bodyRes.expression})`,
        nextIndex: bodyRes.nextIndex
      };
    }

    // --- Case C: 对数 \log ---
    // 目标：生成 log(x, base) 或 log10(x)
    if (val === '\\log') {
      let currentIdx = index + 1;
      let baseExpr = "10"; // 默认底数

      // 1. 检查底数 _{...}
      const baseRes = this.tryExtractSubscript(tokens, currentIdx);
      if (baseRes) {
        baseExpr = baseRes.expression;
        currentIdx = baseRes.nextIndex;
      }

      // 2. 【关键】主动抓取真数 (Argument)
      //    防止 log109 这种粘连，也为了生成 log(arg, base)
      const argRes = this.parseFactor(tokens, currentIdx);

      // 3. 生成结果
      if (baseExpr === "10") {
        return {
          expression: `log10(${argRes.expression})`,
          nextIndex: argRes.nextIndex
        };
      } else {
        return {
          expression: `log(${argRes.expression}, ${baseExpr})`,
          nextIndex: argRes.nextIndex
        };
      }
    }

    // Case C-2: \lg -> log10
    if (val === '\\lg') {
      const argRes = this.parseFactor(tokens, index + 1);
      return { expression: `log10(${argRes.expression})`, nextIndex: argRes.nextIndex };
    }

    // Case C-3: \ln -> log (自然对数)
    if (val === '\\ln') {
      const argRes = this.parseFactor(tokens, index + 1);
      return { expression: `log(${argRes.expression})`, nextIndex: argRes.nextIndex };
    }

    // --- Case D: 三角/双曲函数 ---
    // 目标：生成 func(arg)
    if (['\\sin', '\\cos', '\\tan', '\\sinh', '\\cosh', '\\tanh',
      '\\arcsin', '\\arccos', '\\arctan'].includes(val)) {

      let funcName = val.substring(1); // 去掉 \
      let currentIdx = index + 1;

      // 检查反函数标记 sin^{-1}
      const invRes = this.tryExtractInverse(tokens, currentIdx);
      if (invRes) {
        funcName = "a" + funcName; // sin -> asin
        currentIdx = invRes.nextIndex;
      }
      // 处理直接的 \arcsin
      else if (funcName.startsWith('arc')) {
        funcName = funcName.replace('arc', 'a');
      }

      // 【关键】主动抓取参数
      const argRes = this.parseFactor(tokens, currentIdx);

      return {
        expression: `${funcName}(${argRes.expression})`,
        nextIndex: argRes.nextIndex
      };
    }

    // --- Case E: 括号块 ( ... ) 或 { ... } ---
    if (val === '(') {
      // 寻找配对 )
      const end = this.findMatchingParen(tokens, index, '(', ')');
      const inner = this.parseExpr(tokens, index + 1, end); // 递归解析内部表达式
      return { expression: `(${inner.expression})`, nextIndex: end + 1 };
    }
    if (val === '{') {
      const inner = this.extractBlock(tokens, index); // extractBlock 自带找 } 逻辑
      return { expression: `(${inner.expression})`, nextIndex: inner.nextIndex };
    }

    // --- Case F: 普通数字/变量 ---
    // 直接返回，但要确保 nextIndex + 1
    return { expression: val, nextIndex: index + 1 };
  }

  // --- 辅助方法 ---

  private static extractBlock(tokens: FormulaToken[], startIndex: number): { expression: string, nextIndex: number } {
    if (startIndex >= tokens.length || tokens[startIndex].value !== '{') {
      return { expression: "", nextIndex: startIndex };
    }
    const end = this.findMatchingParen(tokens, startIndex, '{', '}');
    const inner = this.parseExpr(tokens, startIndex + 1, end);
    return { expression: inner.expression, nextIndex: end + 1 };
  }

  private static findMatchingParen(tokens: FormulaToken[], start: number, openChar: string, closeChar: string): number {
    let balance = 1;
    let i = start + 1;
    while (i < tokens.length) {
      if (tokens[i].value === openChar) balance++;
      else if (tokens[i].value === closeChar) balance--;
      if (balance === 0) return i;
      i++;
    }
    return i; // 未闭合，返回末尾
  }

  private static tryExtractSubscript(tokens: FormulaToken[], startIndex: number): { expression: string, nextIndex: number } | null {
    if (startIndex >= tokens.length) return null;
    if (tokens[startIndex].value === '_') {
      // 提取 _ 后面 { ... }
      return this.extractBlock(tokens, startIndex + 1);
    }
    return null;
  }

  private static tryExtractInverse(tokens: FormulaToken[], startIndex: number): { nextIndex: number } | null {
    if (startIndex + 4 < tokens.length &&
      tokens[startIndex].value === '^' &&
      tokens[startIndex + 1].value === '{' &&
      tokens[startIndex + 2].value === '-' &&
      tokens[startIndex + 3].value === '1' &&
      tokens[startIndex + 4].value === '}') {
      return { nextIndex: startIndex + 5 };
    }
    return null;
  }

  private static formatResult(val: any): string {
    if (val === undefined || val === null) return "";
    return math.format(val, { precision: 12, lowerExp: -9, upperExp: 9 });
  }
}