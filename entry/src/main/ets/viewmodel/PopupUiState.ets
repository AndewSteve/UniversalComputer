// viewmodel/PopupUiState.ts
import { KeyModel } from '../model/KeyModel';

@Observed
export class PopupUiState {
  public isVisible: boolean = false;

  // 弹窗在屏幕上的绝对坐标
  public positionX: number = 0;
  public positionY: number = 0;

  // 当前触发长按的原始按键
  public sourceKey: KeyModel | null = null;

  // 当前手指滑动选中的变体索引 (-1 表示未选中)
  public selectedIndex: number = -1;

  // 记录按键的宽度，用于计算偏移
  public keyWidth: number = 0;

  // 显示弹窗
  public show(key: KeyModel, x: number, y: number, keyWidth: number) {
    this.sourceKey = key;
    this.positionX = x;
    this.positionY = y;
    this.keyWidth = keyWidth;
    this.isVisible = true;
    this.selectedIndex = 0; // 默认选中第一个(通常是自己)
  }

  // 隐藏弹窗
  public hide() {
    this.isVisible = false;
    this.sourceKey = null;
    this.selectedIndex = -1;
  }

  // 根据手指的水平位移更新选中项
  public updateSelectionByTouch(touchX: number) {
    if (!this.sourceKey || !this.sourceKey.variants) return;

    const count = this.sourceKey.variants.length;
    // 假设每个变体块的宽度大概是 45vp (或者和 keyWidth 差不多)
    const variantWidth = 50;

    // 计算弹窗的起始 X (因为我们会做边缘检测，所以这里的逻辑要和 UI 渲染逻辑一致)
    // 简化逻辑：计算手指相对于弹窗左边缘的距离
    // 这里的 positionX 是弹窗的左上角 X
    const relativeX = touchX - this.positionX;

    let index = Math.floor(relativeX / variantWidth);

    // 限制范围
    if (index < 0) index = 0;
    if (index >= count) index = count - 1;

    this.selectedIndex = index;
  }
}

export const popupUiState = new PopupUiState();