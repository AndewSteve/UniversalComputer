// pages/Index.ets
import { CalculatorStore, calculatorStore } from '../viewmodel/CalculatorStore';
import { MathKeyboard } from '../components/MathKeyboard';
import { FormulaView } from '../components/FormulaView'; // 引入刚才写的显示组件

@Entry
@Component
struct Index {
  // 引用全局单例 Store
  @State store: CalculatorStore = calculatorStore;

  build() {
    Column() {
      // ------------------------------------------------
      // 1. 顶部标题栏 (可选，为了美观)
      // ------------------------------------------------
      Row() {
        Text("Maple Mode")
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333')
      }
      .width('100%')
      .height(40)
      .padding({ left: 16 })
      .backgroundColor('#FFFFFF')

      // ------------------------------------------------
      // 2. 公式显示核心区
      // ------------------------------------------------
      // 使用 layoutWeight(1) 让它占据剩余空间
      // FormulaView 内部已经实现了 Stack 和 Span 渲染逻辑
      FormulaView({ store: this.store })
        .layoutWeight(1)
        .width('100%')

      // ------------------------------------------------
      // 3. 底部键盘区
      // ------------------------------------------------
      // 键盘内部包含了 TopBar (Undo/Redo/Trash) 和 Grid
      MathKeyboard({ store: this.store })

    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F0F2F5') // 页面底色
  }
}