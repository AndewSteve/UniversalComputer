// pages/Index.ets
import { CalculatorStore, calculatorStore } from '../viewmodel/CalculatorStore';
import { MathKeyboard } from '../components/MathKeyboard';
import { FormulaWebView } from '../components/FormulaWebView';
import { FormulaView } from '../components/FormulaView'; // 引入之前的原生视图

@Entry
@Component
struct Index {
  @State store: CalculatorStore = calculatorStore;

  // 调试用的状态：是否显示原生视图
  @State showDebug: boolean = true;

  build() {
    Column() {
      // 1. 顶部标题栏
      Row() {
        Text("RISC-V Math Renderer")
          .fontSize(16)
          .fontWeight(FontWeight.Bold)

        Blank()

        // 调试开关
        Toggle({ type: ToggleType.Switch, isOn: this.showDebug })
          .onChange((isOn) => {
            this.showDebug = isOn;
          })
      }
      .width('100%')
      .height(40)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#FFFFFF')

      // 2. 显示区域 (使用 Stack 叠加或 Column 分割)
      Column() {
        // A. WebView 渲染层 (最终效果)
        FormulaWebView({
          latexString: this.store.getDisplayLatex()
        })
          .height(this.showDebug ? '40%' : '60%') // 调试模式下分一半空间
          .width('100%')

        if (this.showDebug) {
          Divider().strokeWidth(2).color('#E0E0E0')

          // B. 原生 Token 视图 (用于检查光标和颜色逻辑是否正确)
          Text("Debug View (Raw Tokens):")
            .fontSize(12)
            .fontColor(Color.Gray)
            .margin({ top: 5 })

          FormulaView({ store: this.store })
            .height('20%')
            .width('100%')
            .backgroundColor('#FAFAFA')

          // C. 纯文本 Log (用于检查生成的 LaTeX 字符串)
          Text("Latex String:")
            .fontSize(12)
            .fontColor(Color.Gray)
            .margin({ top: 5 })

          TextArea({ text: this.store.getDisplayLatex() })
            .height('15%')
            .fontSize(12)
            .fontColor('#333')
            .backgroundColor('#F0F0F0')
        }
      }
      .layoutWeight(1)
      .width('100%')

      // 3. 键盘
      MathKeyboard({ store: this.store })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F0F2F5')
  }
}