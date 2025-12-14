// components/MathKey.ets
import { KeyModel } from '../model/KeyModel';
import { popupUiState, PopupUiState } from '../viewmodel/PopupUiState';

@Component
export struct MathKey {
  item: KeyModel | null = null;

  @Prop customBgColor: string = '#424242';
  @Prop customTextColor: string = '#FFFFFF';

  onKeyPress: (key: KeyModel) => void = () => {};

  // 引用 UI 状态
  @State popupState: PopupUiState = popupUiState;

  // 定时器 ID
  private longPressTimer: number = -1;
  private isLongPressTriggered: boolean = false;
  // 记录按键区域，用于定位
  private areaInfo: Area = { width: 0, height: 0, globalPosition: { x: 0, y: 0 }, position: {x:0, y:0} };

  build() {
    Stack({ alignContent: Alignment.TopEnd }) {
      // 1. 按键主体内容
      Stack({ alignContent: Alignment.Center }) {
        Text(this.item?.label)
          .fontSize(20)
          .fontWeight(FontWeight.Regular)
          .fontColor(this.customTextColor)
      }
      .width('100%')
      .height('100%')

      // 2. 右上角的小三角 (Maple 风格指示器)
      if (this.item?.variants && this.item.variants.length > 0) {
        Polygon()
          .points([[0, 0], [12, 0], [12, 12]]) // 倒三角形状
          .fill('#2D9CDB') // 蓝色
          .width(12)
          .height(12)
          .margin({ top: 4, right: 4 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.customBgColor)
    .borderRadius(4)
    // 监听区域变化获取坐标
    .onAreaChange((oldArea, newArea) => {
      this.areaInfo = newArea;
    })
    // 核心触摸逻辑
    .onTouch((event: TouchEvent) => {
      this.handleTouch(event);
    })
  }

  private handleTouch(event: TouchEvent) {
    if (!this.item) return;

    switch (event.type) {
      case TouchType.Down:
        this.isLongPressTriggered = false;
        // 只有定义了 variants 才启动长按检测
        if (this.item.variants && this.item.variants.length > 0) {
          this.longPressTimer = setTimeout(() => {
            this.triggerLongPress();
          }, 300); // 300ms 判定为长按
        }
        break;

      case TouchType.Move:
        // 如果长按已经触发，更新选择索引
        if (this.isLongPressTriggered) {
          // 获取全局 X 坐标
          const touchX = event.touches[0].screenX;
          this.popupState.updateSelectionByTouch(touchX);
        }
        break;

      case TouchType.Up:
      case TouchType.Cancel:
        clearTimeout(this.longPressTimer);

        if (this.isLongPressTriggered) {
          // 长按结束：提交选中的变体
          if (this.popupState.selectedIndex !== -1 && this.item.variants) {
            const selectedVariant = this.item.variants[this.popupState.selectedIndex];
            this.onKeyPress(selectedVariant);
          }
          // 关闭弹窗
          this.popupState.hide();
        } else {
          // 普通点击
          this.onKeyPress(this.item);
        }
        break;
    }
  }

  private triggerLongPress() {
    this.isLongPressTriggered = true;

    // 计算弹窗应该出现的位置 (Global X, Y)
    // Area 中的 globalPosition 是相对于窗口的
    // 我们希望弹窗出现在按键上方，Y 轴减去弹窗高度(预估60)

    // 边缘检测逻辑放在 MathKeyboard 的渲染层更合适，
    // 这里只负责传按键的原始坐标
    if (this.item) {
      const globalX = this.areaInfo.globalPosition.x as number;
      const globalY = this.areaInfo.globalPosition.y as number;
      const width = this.areaInfo.width as number;

      this.popupState.show(this.item, globalX, globalY, width);
    }
  }
}