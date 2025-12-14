// model/TokenFactory.ts
import { KeyModel } from './KeyModel';
import { FormulaToken, TokenType } from './FormulaToken';

export class TokenFactory {

  static createTokens(key: KeyModel): { tokens: FormulaToken[], offset: number } {
    const tokens: FormulaToken[] = [];
    let offset = -1; // -1 表示未找到显式光标位

    // 1. 如果有模板配置，优先使用模板 (Data-Driven)
    if (key.template && key.template.length > 0) {

      key.template.forEach((item, index) => {
        // 创建 Token
        const token = new FormulaToken(item.value, item.type);
        tokens.push(token);

        // 如果该项标记了光标停留位置
        if (item.isCursorStop) {
          // 光标应该在当前插入的 Token 之后
          // 即：当前 tokens 长度
          offset = tokens.length;
        }
      });

      // 如果模板里没配光标位置，默认停在最后
      if (offset === -1) {
        offset = tokens.length;
      }
    }
    else {
      // 2. 没有模板，执行普通插入 (Fallback)
      const type = key.insertType !== undefined ? key.insertType : TokenType.NUMBER;
      const color = key.insertColor;

      tokens.push(new FormulaToken(key.value, type, color));
      offset = 1;
    }

    return { tokens, offset };
  }
}