// viewmodel/core/CalculationService.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { create, all } from 'mathjs';
import { myLogger } from '../../common/values/MyLogger';


// const math = create(all, {
//   number: 'BigNumber',
//   precision: 64
// });

export class CalculationService {

  // 3. 定义一个静态变量来持有实例
  private static mathInstance: any = null;

  // 4. 新增获取实例的方法 (懒加载核心)
  private static getMath() {
    if (!this.mathInstance) {
      console.info("[Math] Initializing MathJS engine...");
      myLogger.log("[Math] Initializing MathJS engine...");
      // 只有在第一次调用时才初始化，避免卡死启动流程
      this.mathInstance = create(all, {
        number: 'BigNumber',
        precision: 64
      });
    }
    return this.mathInstance;
  }

  private static readonly COMPLEX_SYMBOLS = [
    '\\int', '\\sum', '\\lim', '\\prod', 'd', 'dx'
  ];

  private static readonly OP_MAP: Record<string, string> = {
    '\\cdot': '*', '\\times': '*', '\\div': '/',
    '+': '+', '-': '-', '^': '^', '=': '=='
  };

  static evaluateRealTime(tokens: FormulaToken[], isDegree: boolean): string | null {
    console.info("DEBUG: 开始计算 evaluateRealTime"); // ✅ 确认是否进入
    myLogger.log("DEBUG: 开始计算 evaluateRealTime");
    // return null;

    const math = this.getMath();

    // 1. 快速过滤复杂公式
    for (const t of tokens) {
      if (this.COMPLEX_SYMBOLS.includes(t.value)) return null;
    }

    try {
      // 2. 解析生成表达式
      const { expression } = this.parseExpr(tokens, 0, tokens.length);

      // 如果表达式为空，或者解析结果仅仅是 "()" 这种无效串，返回 null
      if (!expression.trim() || expression === '()') return null;

      console.info(`[MathDebug] Generated: "${expression}"`);

      // 3. 定义作用域 (Scope)
      const scope = {
        // --- 三角函数 (处理角度/弧度) ---
        sin: (x: any) => isDegree ? math.sin(math.unit(x, 'deg')) : math.sin(x),
        cos: (x: any) => isDegree ? math.cos(math.unit(x, 'deg')) : math.cos(x),
        tan: (x: any) => isDegree ? math.tan(math.unit(x, 'deg')) : math.tan(x),

        asin: (x: any) => isDegree ? math.unit(math.asin(x), 'rad').toNumber('deg') : math.asin(x),
        acos: (x: any) => isDegree ? math.unit(math.acos(x), 'rad').toNumber('deg') : math.acos(x),
        atan: (x: any) => isDegree ? math.unit(math.atan(x), 'rad').toNumber('deg') : math.atan(x),

        // --- 双曲函数 ---
        sinh: math.sinh, cosh: math.cosh, tanh: math.tanh,
        asinh: math.asinh, acosh: math.acosh, atanh: math.atanh,

        // --- 对数与根 ---
        log: math.log,   // log(x) 或 log(x, base)
        log10: math.log10,
        sqrt: math.sqrt,
        nthRoot: math.nthRoot, // 显式引入 nthRoot

        // --- 常量 ---
        pi: math.pi,
        e: math.e
      };

      // 4. 执行计算
      const result = math.evaluate(expression, scope);
      const resStr = this.formatResult(result);
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
    let loopCount = 0; // ✅ 防止死循环的保险丝

    while (i < end) {
      loopCount++;
      if (loopCount > 1000) { // 如果循环超过1000次，强制报错并退出
        console.error("CRITICAL: parseExpr 死循环！强制跳出");
        break;
      }
      const token = tokens[i];
      const val = token.value;

      // 1. 遇到需要解析的“因子” (函数、数字、变量、括号)
      if (token.type === TokenType.COMMAND ||
        token.type === TokenType.NUMBER ||
        token.type === TokenType.VARIABLE ||
        val === '(' || val === '{' || val === '[') { // 增加 '[' 处理可能出现的数组或范围，尽管数学公式里少见

        const factorRes = this.parseFactor(tokens, i);

        // 【优化】隐式乘法处理
        // 如果当前 expr 结尾是数字/右括号，且新因子是变量/函数/左括号，补一个 *
        // 例如: 2pi -> 2*pi, (1)(2) -> (1)*(2)
        // 这里简单处理：只要 expr 不为空且最后一个字符不是运算符，就补 *
        // 但为了安全起见，我们目前只依靠 OP_MAP 里的运算符，或者依赖 Math.js 的部分隐式乘法能力

        expr += factorRes.expression;
        i = factorRes.nextIndex;
      }
      // 2. 遇到运算符
      else if (this.OP_MAP[val]) {
        expr += this.OP_MAP[val];
        i++;
      }
      // 3. 忽略结构标记
      else if (token.type === TokenType.STRUCT_MARKER) {
        i++;
      }
      // 4. 其他直接拼接
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

    // --- Case 0: 常量处理 (\pi, e) ---
    // 【关键修复】明确将 \pi 转换为 pi 字符串
    if (val === '\\pi') {
      return { expression: 'pi', nextIndex: index + 1 };
    }
    if (val === 'e') {
      return { expression: 'e', nextIndex: index + 1 };
    }

    // --- Case A: 分数 \frac{a}{b} ---
    if (val === '\\frac') {
      const numRes = this.extractBlock(tokens, index + 1);
      const denRes = this.extractBlock(tokens, numRes.nextIndex);
      return {
        expression: `(${numRes.expression}) / (${denRes.expression})`,
        nextIndex: denRes.nextIndex
      };
    }

    // --- Case B: 根号 \sqrt{x} 或 \sqrt[n]{x} ---
    // 【关键修复】支持 N 次方根
    if (val === '\\sqrt') {
      let degree = "2"; // 默认为 2 (平方根)
      let currentIdx = index + 1;

      // 1. 检查是否有方括号 [n]
      if (currentIdx < tokens.length && tokens[currentIdx].value === '[') {
        const degreeEnd = this.findMatchingParen(tokens, currentIdx, '[', ']');
        // 解析方括号内部作为次数
        const degreeRes = this.parseExpr(tokens, currentIdx + 1, degreeEnd);
        degree = degreeRes.expression;
        currentIdx = degreeEnd + 1;
      }

      // 2. 提取根号内容 {x}
      const bodyRes = this.extractBlock(tokens, currentIdx);

      // 3. 生成 nthRoot(x, n)
      // 注意：Math.js 的 nthRoot 第一个参数是底数，第二个是根指数
      return {
        expression: `nthRoot(${bodyRes.expression}, ${degree})`,
        nextIndex: bodyRes.nextIndex
      };
    }

    // --- Case C: 对数 \log ---
    if (val === '\\log') {
      let currentIdx = index + 1;
      let baseExpr = "10";

      // 检查底数 _{...}
      const baseRes = this.tryExtractSubscript(tokens, currentIdx);
      if (baseRes) {
        baseExpr = baseRes.expression;
        currentIdx = baseRes.nextIndex;
      }

      // 获取真数
      const argRes = this.parseFactor(tokens, currentIdx);

      if (baseExpr === "10") {
        return { expression: `log10(${argRes.expression})`, nextIndex: argRes.nextIndex };
      } else {
        return { expression: `log(${argRes.expression}, ${baseExpr})`, nextIndex: argRes.nextIndex };
      }
    }

    if (val === '\\lg') {
      const argRes = this.parseFactor(tokens, index + 1);
      return { expression: `log10(${argRes.expression})`, nextIndex: argRes.nextIndex };
    }

    if (val === '\\ln') {
      const argRes = this.parseFactor(tokens, index + 1);
      // Math.js 中 log(x) 默认就是自然对数 (base e)
      return { expression: `log(${argRes.expression})`, nextIndex: argRes.nextIndex };
    }

    // --- Case D: 三角/双曲函数 ---
    if (['\\sin', '\\cos', '\\tan', '\\sinh', '\\cosh', '\\tanh',
      '\\arcsin', '\\arccos', '\\arctan'].includes(val)) {

      let funcName = val.substring(1);
      let currentIdx = index + 1;

      const invRes = this.tryExtractInverse(tokens, currentIdx);
      if (invRes) {
        funcName = "a" + funcName;
        currentIdx = invRes.nextIndex;
      } else if (funcName.startsWith('arc')) {
        funcName = funcName.replace('arc', 'a');
      }

      const argRes = this.parseFactor(tokens, currentIdx);

      return {
        expression: `${funcName}(${argRes.expression})`,
        nextIndex: argRes.nextIndex
      };
    }

    // --- Case E: 括号块 ---
    if (val === '(') {
      const end = this.findMatchingParen(tokens, index, '(', ')');
      const inner = this.parseExpr(tokens, index + 1, end);
      return { expression: `(${inner.expression})`, nextIndex: end + 1 };
    }
    if (val === '{') {
      const inner = this.extractBlock(tokens, index);
      return { expression: `(${inner.expression})`, nextIndex: inner.nextIndex };
    }

    // --- Case F: 其他 ---
    // 直接返回 Value (例如 "1", "x", "+", 等)
    // 此时如果是 \pi 漏网之鱼，会被当做字符串，导致 Math.js 报错，
    // 但前面 Case 0 已经处理了 \pi
    return { expression: val, nextIndex: index + 1 };
  }

  // --- 辅助方法 ---

  private static extractBlock(tokens: FormulaToken[], startIndex: number): { expression: string, nextIndex: number } {
    if (startIndex >= tokens.length || tokens[startIndex].value !== '{') {
      // 容错：如果应该有 {} 但没有，可能用户还没输入完，尝试解析下一个因子
      // 或者直接返回空，等待用户输入
      return this.parseFactor(tokens, startIndex);
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
    const math = this.getMath();
    return math.format(val, { precision: 10, lowerExp: -9, upperExp: 9 });
  }
}