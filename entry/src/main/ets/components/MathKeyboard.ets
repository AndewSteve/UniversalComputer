// components/MathKeyboard.ets
import { display } from '@kit.ArkUI'; // 【新增】引入 display 模块
import { KeyModel,KeyAction } from '../model/KeyModel';
import { MathKey } from './MathKey';
import { CalculatorStore } from '../viewmodel/CalculatorStore';
import { PopupUiState, popupUiState } from '../viewmodel/PopupUiState';
import { AppColors } from '../common/values/AppColors';

import { MAPLE_KEYS } from '../model/KeyConfig';
import { FIGURE_KEYS } from '../model/FigureConfig';


// 常量定义
const CELL_WIDTH = 50;
const CELL_HEIGHT = 50;
const POPUP_OFFSET_Y = 60;

interface MyPosition {
  x: number;
  y: number;
}

@Component
export struct MathKeyboard {
  @ObjectLink store: CalculatorStore;
  @State popupState: PopupUiState = popupUiState;

  // 【新增】键盘模式状态
  @State isSymbolMode: boolean = false;

  // 【新增】键盘容器自身的全局位置，用于坐标修正
  @State keyboardGlobalPos: MyPosition = { x: 0, y: 0 };

  // 【修改】屏幕宽度初始化为 0，稍后获取
  @State screenWidth: number = 0;

  // 【新增】组件加载时获取真实屏幕宽度
  aboutToAppear() {
    try {
      const displayClass = display.getDefaultDisplaySync();
      this.screenWidth = displayClass.width;
      // 注意：如果是 vp 单位，可能需要 px2vp 转换，
      // 但 display.width 通常返回 px。ArkUI 的 position 默认单位是 vp。
      // 为了稳妥，我们可以假设这里都用 vp 或者统一转换。
      // 在 API 10+ 中，display.width 是 px。
      // 如果你的布局乱了，这里可能需要 px2vp(displayClass.width)
      // 但通常 onAreaChange 给出的 globalPosition 也是 px (取决于系统设置)，
      // 只要单位统一即可。这里我们暂时直接使用，如果偏大则加上 px2vp。
      this.screenWidth = px2vp(displayClass.width);
    } catch (err) {
      console.error('Failed to obtain the screen width:', JSON.stringify(err));
      this.screenWidth = 360; // 降级默认值
    }
  }

  // 计算弹窗显示的 X 坐标 (相对于 Keyboard Stack)
  private getPopupX(): number {
    if (!this.popupState.sourceKey || !this.popupState.sourceKey.variants) {
      return 0;
    }

    const variantsCount = this.popupState.sourceKey.variants.length;
    const totalWidth = variantsCount * CELL_WIDTH;

    // 1. 获取按键的全局 X
    let globalX = this.popupState.positionX;

    // 2. 边缘检测 (基于全局坐标和屏幕宽度)
    // 如果 (弹窗全局X + 弹窗宽) > 屏幕宽，则向左偏移
    if (globalX + totalWidth > this.screenWidth - 10) {
      globalX = (this.screenWidth - totalWidth - 10);
    }
    if (globalX < 10) globalX = 10;

    // 3. 【核心修复】：转换为局部坐标
    // 局部 X = 目标全局 X - 键盘容器全局 X
    return globalX - this.keyboardGlobalPos.x;
  }

  // 计算弹窗显示的 Y 坐标 (相对于 Keyboard Stack)
  private getPopupY(): number {
    // 目标全局 Y = 按键全局 Y - 偏移量
    const targetGlobalY = this.popupState.positionY - POPUP_OFFSET_Y;

    // 【核心修复】：转换为局部坐标
    // 局部 Y = 目标全局 Y - 键盘容器全局 Y
    return targetGlobalY - (this.keyboardGlobalPos.y || 0);
  }

  // 【核心】：统一处理按键点击
  private onKeyClick(key: KeyModel) {
    // 1. 如果是手动返回键 (我们在配置里加了个 value='BACK' 的占位)
    // 虽然 KeyAction 可能是 NAV_DOWN，但我们可以特判
    if (key.value === 'BACK') {
      this.isSymbolMode = false;
      return;
    }

    // 2. 执行 Store 的操作
    this.store.handleInput(key);

    // 3. 【核心逻辑】：如果在符号模式下，且执行的是插入操作，立即切回数字键盘
    if (this.isSymbolMode && key.action === KeyAction.INSERT) {
      // 为了体验稍微好一点，也可以加个小延时，或者直接切回
      this.isSymbolMode = false;
    }
  }

  // 【辅助】：获取当前应该显示的键位列表
  private getCurrentKeys(): KeyModel[] {
    return this.isSymbolMode ? FIGURE_KEYS : MAPLE_KEYS;
  }

  build() {
    Stack() {
      Column() {
        // --- Top Bar (逻辑不变) ---
        Row() {
          // 【核心修改】：使用组件 TabButton 替代原来的 Builder
          TabButton({
            text: "f∫∑",
            isActive: this.isSymbolMode, // 绑定 @State，变化时绝对会刷新
            action: () => {
              this.isSymbolMode = !this.isSymbolMode;
            }
          })

          this.TopBarButton("abc", () => { })
          Blank()
          this.TopBarButton("↶", () => { this.store.undo(); })
          this.TopBarButton("↷", () => { this.store.redo(); })
          this.TopBarButton("🗑", () => { this.store.clearAll(); })
        }
        .width('100%')
        .height(45)
        .backgroundColor('#1E1E1E')
        .padding({ left: 5, right: 5 })
        .alignItems(VerticalAlign.Center)

        // --- Grid Area ---
        Grid() {
          // 使用函数获取数据源
          ForEach(this.getCurrentKeys(), (keyItem: KeyModel) => {
            GridItem() {
              MathKey({
                item: keyItem,
                customBgColor: keyItem.bgColor,
                customTextColor: keyItem.textColor || '#FFFFFF',
                // 【修改】：绑定到新的 onKeyClick
                onKeyPress: (k): void => this.onKeyClick(k)
              })
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr')
        .rowsTemplate('1fr 1fr 1fr 1fr 1fr')
        .rowsGap(1)
        .columnsGap(1)
        .width('100%')
        .layoutWeight(1)
        .backgroundColor('#1E1E1E')
        .padding(4)
      }
      .width('100%')
      .height(300)
      .backgroundColor('#1E1E1E')

      // --- 弹窗 Overlay ---
      if (this.popupState.isVisible && this.popupState.sourceKey && this.popupState.sourceKey.variants) {
        this.VariantPopupBuilder()
      }
    }
    .alignContent(Alignment.TopStart) // 确保定位从左上角开始算
    // 【新增】：监听键盘容器自身的全局位置
    .onAreaChange((oldValue, newValue) => {
      this.keyboardGlobalPos = {
        x: newValue.globalPosition.x as number,
        y: newValue.globalPosition.y as number
      };
    })
  }

  @Builder
  VariantPopupBuilder() {
    Row() {
      if (this.popupState.sourceKey && this.popupState.sourceKey.variants) {
        ForEach(this.popupState.sourceKey.variants, (item: KeyModel, index: number) => {
          Stack({ alignContent: Alignment.Center }) {
            Text(item.label)
              .fontSize(22)
              .fontColor('#FFF')
              .fontWeight(FontWeight.Medium)
          }
          .width(CELL_WIDTH)
          .height(CELL_HEIGHT)
          .backgroundColor(index === this.popupState.selectedIndex ? '#2D9CDB' : 'transparent')
          .borderRadius(4)
        })
      }
    }
    .height(CELL_HEIGHT)
    .backgroundColor('#333333')
    .borderRadius(8)
    .shadow({ radius: 10, color: 'rgba(0,0,0,0.5)', offsetY: 4 })
    .position({
      x: this.getPopupX(), // 使用转换后的局部坐标
      y: this.getPopupY()
    })
    .zIndex(999)
  }

  // 修改前: @Builder TopBarButton(text: string, action: () => void, isActive: boolean = false)
  // 修改后: 接收确定的颜色字符串
  @Builder TopBarButton(text: string, action: () => void, textColor: string = '#FFFFFF') {
    Button({ type: ButtonType.Normal, stateEffect: true }) {
      Text(text)
        .fontColor(textColor) // 直接使用传入的颜色
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
    }
    .backgroundColor('transparent')
    .width(50)
    .height('100%')
    .onClick(() => { action(); })
  }
}

@Component
struct TabButton {
  @Prop text: string;
  @Prop isActive: boolean; // 接收高亮状态
  // ArkTS 中组件传回调需要这样定义
  action: () => void = () => {};

  build() {
    Button({ type: ButtonType.Normal, stateEffect: true }) {
      Text(this.text)
        .fontColor(this.isActive ? '#2D9CDB' : '#FFFFFF') // 强制根据 isActive 变色
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
    }
    .backgroundColor('transparent')
    .width(50)
    .height('100%')
    .onClick(() => {
      this.action();
    })
  }
}