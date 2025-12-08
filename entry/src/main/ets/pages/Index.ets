// entry/src/main/ets/pages/Index.ets
import router from '@ohos.router';

@Entry
@Component
struct Index {
  build() {
    Column() {
      Button("启动全能计算机 (Maple)")
        .onClick(() => {
          // 使用 pushUrl 跳转
          router.pushUrl({
            url: 'pages/UniversalComputer/UniversalComputerPage'
          }).catch(() => {
            // TODO: Implement error handling.
          });
        })
        .width('80%')
        .height(50)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}