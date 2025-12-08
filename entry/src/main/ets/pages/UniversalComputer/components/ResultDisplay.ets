import { ComputerStore } from '../model/ComputerStore';

@Component
export struct ResultLog {
  @ObjectLink store: ComputerStore;

  build() {
    Column() {
      Row() {
        Text("计算日志 / History").fontWeight(FontWeight.Bold).fontSize(16)
        Blank()
        Text("清空")
          .fontColor(Color.Blue)
          .onClick(() => this.store.clearLogs())
      }
      .width('100%')
      .padding({ bottom: 10 })

      List({ space: 10 }) {
        // 遍历日志数组
        ForEach(this.store.logs, (log: string, index: number) => {
          ListItem() {
            Text(log)
              .fontSize(16)
              .fontFamily('Monospace') // 等宽字体看起来更像计算机
              .backgroundColor('#F0F8FF')
              .padding(12)
              .borderRadius(8)
              .width('100%')
          }
        })
      }
      .width('100%')
      .layoutWeight(1) // 占满剩余高度
    }
    .padding(15)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 10 })
    .shadow({ radius: 5, color: '#1a000000', offsetY: 2 })
  }
}