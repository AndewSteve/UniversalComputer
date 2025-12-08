// entry/src/main/ets/pages/UniversalComputer/UniversalComputerPage.ets
import { create, all } from 'mathjs';
import router from '@ohos.router'; // 导入路由模块
import { ComputerStore } from './model/ComputerStore';
import { FormulaInput } from './components/FormulaInput';
import { ResultLog } from './components/ResultLog';

const math = create(all);

@Entry
@Component
struct UniversalComputerPage {
  // 实例化 Store
  @State store: ComputerStore = new ComputerStore();

  build() {
    Column() {
      // 标题栏
      Row() {
        Button({ type: ButtonType.Normal, stateEffect: true }) {
          Image($r('sys.symbol.chevron_left')) // 随便找个图标，或者用 Text("<")
            .width(24)
            .height(24)
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => router.back())

        Text("Maple-Core (RISC-V)")
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 10 })
      }
      .width('100%')
      .height(56)
      .padding({ left: 10, right: 10 })
      .backgroundColor('#FFFFFF')

      // 内容区
      Column() {
        // 1. 输入区域组件
        FormulaInput({ store: this.store })

        // 2. 结果区域组件
        ResultLog({ store: this.store })
          .layoutWeight(1) // 填满剩余空间
      }
      .width('100%')
      .layoutWeight(1)
      .padding(10)
      .backgroundColor('#F1F3F5') // 浅灰背景
    }
    .height('100%')
  }
}