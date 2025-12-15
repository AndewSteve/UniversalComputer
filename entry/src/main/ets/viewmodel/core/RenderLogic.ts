// viewmodel/core/RenderLogic.ts
import { FormulaToken, TokenType } from '../../model/FormulaToken';

export class RenderLogic {

  static generateDisplayLatex(tokens: FormulaToken[], cursorIndex: number): string {
    let latex = "";

    if (tokens.length === 0) {
      return RenderLogic.getCursorHex();
    }

    for (let i = 0; i < tokens.length; i++) {
      if (i === cursorIndex) {
        latex += RenderLogic.getCursorHex();
      }

      const token = tokens[i];
      let value = token.value;

      // 1. 结构符号不上色
      if (value === '{' || value === '}' || value === '[' || value === ']') {
        latex += value;
        continue;
      }

      // 2. 【核心修改】结构性标记 (STRUCT_MARKER) 和 结构性运算符 (普通的 ^ _) 都不上色
      // 否则 \textcolor{red}{^} 会导致 LaTeX 语法错误
      if (token.type === TokenType.STRUCT_MARKER || value === '^' || value === '_') {
        latex += value;
        continue;
      }

      // 2. Command 不上色
      if (token.type === TokenType.COMMAND) {
        latex += value;
        continue;
      }

      // 3. 内容上色
      const color = token.getColor(); // 使用 Token 自身的颜色逻辑
      // 这里可以根据需要判断是否是默认黑，如果是黑则不上色以精简 latex
      if (color && color !== '#000000' && color !== '#1F1F1F') {
        latex += `\\textcolor{${color}}{${value}}`;
      } else {
        latex += value;
      }
    }

    if (cursorIndex === tokens.length) {
      latex += RenderLogic.getCursorHex();
    }

    return latex;
  }

  private static getCursorHex(): string {
    return `\\textcolor{#FF0055}{|}`;
  }
}