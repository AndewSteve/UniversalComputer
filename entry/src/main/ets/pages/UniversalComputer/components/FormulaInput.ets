import { ComputerStore } from '../model/ComputerStore';

@Component
export struct FormulaInput {
  // 接收 Store 对象，使用 @ObjectLink 实现双向绑定/监听
  @ObjectLink store: ComputerStore;

  build() {
    Column({ space: 10 }) {
      TextInput({ text: this.store.currentInput, placeholder: '输入数学表达式...' })
        .onChange((value) => {
          this.store.currentInput = value;
        })
        .width('90%')
        .height(50)
        .backgroundColor('#F5F5F5')
        .borderRadius(10)

      // 操作按钮区
      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.SpaceEvenly }) {
        Button("求导 (d/dx)").onClick(() => this.store.solveDerivative()).margin(5)
        Button("化简 (Simp)").onClick(() => this.store.solveSimplify()).margin(5)
        Button("矩阵测试").onClick(() => this.store.runMatrixDemo()).backgroundColor(Color.Gray).margin(5)
      }
      .width('100%')
    }
    .padding(10)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 5, color: '#1a000000', offsetY: 2 })
  }
}