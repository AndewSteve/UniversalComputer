// components/FormulaView.ets
import { CalculatorStore } from '../viewmodel/CalculatorStore';
import { FormulaToken, TokenType } from '../model/FormulaToken';
import { AppColors } from '../common/values/AppColors';
import { pasteboard } from '@kit.BasicServicesKit';
import { promptAction } from '@kit.ArkUI';

@Component
export struct FormulaView {
  @ObjectLink store: CalculatorStore;

  build() {
    Stack({ alignContent: Alignment.TopEnd }) { // 使用 Stack 放置悬浮按钮

      // 1. 原有的 Token 列表视图
      Scroll() {
        Column() {
          Text() {
            ForEach(this.generateRenderList(), (item: FormulaToken) => {
              // ... 保持原有 Span 渲染逻辑 ...
              if (item.type === TokenType.CURSOR) {
                Span('|').fontColor('#FF0055').fontSize(20).fontWeight(FontWeight.Lighter)
              } else {
                Span(item.value)
                  .fontColor(item.getColor())
                  .fontSize(20)
                  .fontWeight(item.type === TokenType.COMMAND ? FontWeight.Medium : FontWeight.Regular)
                  .textBackgroundStyle({ color: this.isTokenSelected(item) ? '#402D9CDB' : 'transparent' })
              }
            }, (item: FormulaToken) => item.id)
          }
          .width('100%')
          .textAlign(TextAlign.Start)
        }
        .width('100%')
        .alignItems(HorizontalAlign.Start)
        .padding({ left: 12, right: 12, top: 16, bottom: 16 })
      }
      .width('100%')
      .height('100%')
      .align(Alignment.TopStart)

      // 2. 【新增】复制按钮 (悬浮在右上角)
      Button({ type: ButtonType.Normal, stateEffect: true }) {
        Row() {
          // 这里可以用 SymbolGlyph 或者 Text "Copy"
          Text("Copy")
            .fontSize(12)
            .fontColor(Color.White)
        }
      }
      .backgroundColor('#99000000') // 半透明黑
      .borderRadius(12)
      .height(24)
      .padding({ left: 8, right: 8 })
      .margin({ top: 8, right: 8 })
      .onClick(() => {
        this.copyLatex();
      })

    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FAFAFA')
  }

  // 复制逻辑
  private copyLatex() {
    const latex = this.store.getDisplayLatex();
    const pasteData = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, latex);
    pasteboard.getSystemPasteboard().setData(pasteData).catch(() => {
      // TODO: Implement error handling.
    }).then(() => {
      try {
        promptAction.showToast({ message: 'LaTeX Copied!', duration: 1500 });
      } catch (error) {
        // TODO: Implement error handling.
      }
    });
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