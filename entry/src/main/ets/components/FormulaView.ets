// components/FormulaView.ets
import { CalculatorStore } from '../viewmodel/CalculatorStore';
import { FormulaToken, TokenType } from '../model/FormulaToken';

@Component
export struct FormulaView {
  @ObjectLink store: CalculatorStore;

  build() {
    Column() {
      Text() {
        ForEach(this.generateRenderList(), (item: FormulaToken) => {
          if (item.type === TokenType.CURSOR) {
            // 光标
            Span('|')
              .fontColor('#FF0055')
              .fontSize(32)
              .fontWeight(FontWeight.Lighter)
          } else {
            // 普通 Token
            Span(item.value)
              .fontColor(item.getColor())
              .fontSize(32)
              .fontWeight(item.type === TokenType.COMMAND ? FontWeight.Medium : FontWeight.Regular)
              // 选区背景高亮 (淡蓝色)
              .textBackgroundStyle({
                color: this.isTokenSelected(item) ? '#402D9CDB' : 'transparent'
              })
          }
        }, (item: FormulaToken) => item.id) // 使用唯一ID作为Key
      }
      .width('100%')
      .textAlign(TextAlign.Start) // 左对齐
      .maxLines(10) // 允许多行
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .padding({ left: 16, right: 16, top: 20, bottom: 20 })
    .backgroundColor('#FFFFFF')
  }

  // 1. 判断 Token 是否在 Store 的选区内
  private isTokenSelected(renderToken: FormulaToken): boolean {
    // 找到该 token 在 store.tokens 中的真实索引
    // 注意：renderToken 可能是引用，也可能是我们插入光标时切分出来的
    // 最靠谱的方法是通过 ID 查找
    const realIndex = this.store.tokens.findIndex(t => t.id === renderToken.id);
    if (realIndex !== -1) {
      return this.store.isIndexSelected(realIndex);
    }
    return false;
  }

  // 2. 生成包含光标的渲染列表
  private generateRenderList(): FormulaToken[] {
    const result: FormulaToken[] = [];
    const tokens = this.store.tokens;
    const cursorIdx = this.store.cursorIndex;

    // 插入光标前的部分
    for (let i = 0; i < cursorIdx; i++) {
      result.push(tokens[i]);
    }

    // 插入虚拟光标 (只有在没有选区，或者你需要提示插入点的时候显示)
    // 这里我们选择：始终显示光标，哪怕有选区，光标指示了替换的起点
    const cursorToken = new FormulaToken('|', TokenType.CURSOR);
    result.push(cursorToken);

    // 插入光标后的部分
    for (let i = cursorIdx; i < tokens.length; i++) {
      result.push(tokens[i]);
    }

    return result;
  }
}