// viewmodel/core/CalculationService.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';
import { evaluate, create, all } from 'mathjs';

// 创建一个独立的 mathjs 实例，方便配置
const math = create(all, {
  number: 'BigNumber', // 使用高精度小数
  precision: 64
});

export class CalculationService {

  // 黑名单：包含这些符号时停止实时计算
  private static readonly COMPLEX_SYMBOLS = [
    '\\int', '\\sum', '\\lim', '\\prod', 'd', 'dx'
  ];

  /**
   * 翻译映射表 (Abstraction Layer)
   * 这里定义 LaTeX 符号对应的 MathJS 运算符
   */
  private static readonly OP_MAP: Record<string, string> = {
    '\\cdot': '*',
    '\\times': '*',
    '\\div': '/',
    '+': '+',
    '-': '-',
    '^': '^',
    '=': '=='
  };

  /**
   * 实时计算入口
   * @param tokens Token 列表
   * @param isDegree 是否为角度制
   */
  static evaluateRealTime(tokens: FormulaToken[], isDegree: boolean): string | null {
    // 1. 快速检查黑名单
    for (const t of tokens) {
      if (this.COMPLEX_SYMBOLS.includes(t.value) || t.type === TokenType.STRUCT_MARKER) {
        return null;
      }
    }

    try {
      // 2. 递归翻译 (LaTeX Tokens -> Math Expression)
      const { expression } = this.parseGroup(tokens, 0, tokens.length);

      if (!expression.trim()) return null;

      // 3. 构建计算作用域 (处理角度/弧度)
      // 我们通过重写三角函数来实现 Rad/Deg 切换，而不是去改 global config
      const scope = {
        sin: (x: any) => isDegree ? math.sin(math.unit(x, 'deg')) : math.sin(x),
        cos: (x: any) => isDegree ? math.cos(math.unit(x, 'deg')) : math.cos(x),
        tan: (x: any) => isDegree ? math.tan(math.unit(x, 'deg')) : math.tan(x),
        // 你可以在这里扩展更多函数，例如 arcsin 等
        pi: math.pi,
        e: math.e
      };

      // 4. 执行计算
      const result = math.evaluate(expression, scope);

      return this.formatResult(result);
    } catch (e) {
      // 语法错误或输入未完成时，静默失败
      return null;
    }
  }

  /**
   * 【核心算法】递归解析 Token 流
   * 处理嵌套结构如 \frac{...}{...} 或 \sqrt{...}
   */
  private static parseGroup(tokens: FormulaToken[], start: number, end: number): { expression: string, nextIndex: number } {
    let expr = "";
    let i = start;

    while (i < end) {
      const token = tokens[i];
      const val = token.value;

      // --- Case A: 分数 \frac{num}{den} ---
      if (val === '\\frac') {
        // 1. 解析分子 { ... }
        const numStart = i + 1; // 跳过 \frac
        const numRes = this.extractBlock(tokens, numStart);
        // 2. 解析分母 { ... }
        const denStart = numRes.nextIndex;
        const denRes = this.extractBlock(tokens, denStart);

        // 拼接为 (num) / (den)
        expr += `(${numRes.expression}) / (${denRes.expression})`;

        // 更新指针
        i = denRes.nextIndex;
      }
      // --- Case B: 根号 \sqrt{body} ---
      else if (val === '\\sqrt') {
        // 检查是否有方括号 [] (立方根等)，暂时简化处理，默认只处理 {}
        // 如果你的 KeyConfig 有 \sqrt[3]，这里需要额外判断
        const bodyStart = i + 1;
        const bodyRes = this.extractBlock(tokens, bodyStart);

        expr += `sqrt(${bodyRes.expression})`;
        i = bodyRes.nextIndex;
      }
      // --- Case C: 普通括号 ( ) ---
      else if (val === '(') {
        expr += '(';
        i++;
      }
      else if (val === ')') {
        expr += ')';
        i++;
      }
      // --- Case D: 结构性括号 { } (用于 \frac 以外的场景，如 ^) ---
      else if (val === '{') {
        // 递归解析大括号内部
        const blockRes = this.parseGroup(tokens, i + 1, end); // 这里可能有问题，需要找配对的 }
        // 但通常 extractBlock 更好用。如果只是普通分组，直接当括号处理？
        // 这里的策略是：如果是独立的 {，我们解析它直到遇到 }
        // 简单起见，调用 extractBlock 剥离外壳
        const inner = this.extractBlock(tokens, i);
        expr += `(${inner.expression})`;
        i = inner.nextIndex;
      }
      else if (val === '}') {
        // 遇到未预期的右括号，直接结束当前层级解析
        return { expression: expr, nextIndex: i + 1 };
      }
      // --- Case E: 运算符映射 ---
      else if (this.OP_MAP[val]) {
        expr += this.OP_MAP[val];
        i++;
      }
      // --- Case F: 函数名 (sin, cos) ---
      else if (['\\sin', '\\cos', '\\tan', '\\ln', '\\log'].includes(val)) {
        // 去掉反斜杠
        expr += val.substring(1);
        i++;
      }
      // --- Case G: 普通数字或变量 ---
      else {
        expr += val;
        i++;
      }
    }
    return { expression: expr, nextIndex: i };
  }

  /**
   * 辅助函数：提取 { ... } 块的内容并递归翻译
   * @returns expression: 块内翻译后的字符串, nextIndex: 块结束后的索引
   */
  private static extractBlock(tokens: FormulaToken[], startIndex: number): { expression: string, nextIndex: number } {
    // 确保当前是 '{'
    if (startIndex >= tokens.length || tokens[startIndex].value !== '{') {
      return { expression: "", nextIndex: startIndex };
    }

    // 寻找配对的 '}'
    let balance = 1;
    let endIndex = startIndex + 1;
    while (endIndex < tokens.length) {
      if (tokens[endIndex].value === '{') balance++;
      else if (tokens[endIndex].value === '}') balance--;

      if (balance === 0) break;
      endIndex++;
    }

    // 递归解析 { 和 } 之间的内容
    const innerResult = this.parseGroup(tokens, startIndex + 1, endIndex);

    return {
      expression: innerResult.expression,
      nextIndex: endIndex + 1 // 跳过末尾的 }
    };
  }

  private static formatResult(val: any): string {
    if (val === undefined || val === null) return "";
    // 将 BigNumber 转为字符串，保留适当精度
    return math.format(val, { precision: 10, lowerExp: -9, upperExp: 9 });
  }
}