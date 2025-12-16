// pages/Index.ets
import { CalculatorStore, calculatorStore } from '../viewmodel/CalculatorStore';
import { MathKeyboard } from '../components/MathKeyboard';
import { FormulaWebView } from '../components/FormulaWebView';
import { FormulaView } from '../components/FormulaView';
import { AppColors } from '../common/values/AppColors';
import { AnalysisView } from '../components/AnalysisView';

@Entry
@Component
struct Index {
  @State store: CalculatorStore = calculatorStore;
  // Tab 索引: 0=组件, 1=结果, 2=分析
  @State bottomPreviewMode: number = 0;
  @State isEditorExpanded: boolean = false;

  // 【新增】控制键盘显示/隐藏的状态
  @State isKeyboardVisible: boolean = true;

  // 【核心】：专门用于传给 AnalysisView 的状态
  // 只有当用户点击“完成”时，我们才更新这个变量
  @State targetFormula: string = "";

  build() {
    Column() {
      // 1. Header
      Row() {
        Text("RISC-V Math")
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1D1D1D')
        // 【新增】角度模式切换按钮 (紧跟标题或放在中间)
        Button({ type: ButtonType.Normal, stateEffect: true }) {
          Text(this.store.isDegree ? "DEG" : "RAD")
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor('#555')
        }
        .backgroundColor('#F0F0F0')
        .borderRadius(8)
        .height(24)
        .margin({ left: 12 })
        .onClick(() => {
          this.store.toggleAngleMode();
        })
        Blank()
        Row() {
          this.SegmentButton("LaTex", 0)
          this.SegmentButton("结果", 1)
          this.SegmentButton("分析", 2)
        }
        .backgroundColor('#EEEEEE')
        .borderRadius(20)
        .padding(2)
      }
      .width('100%')
      .height(50)
      .padding({ left: 16, right: 16 })
      .backgroundColor(Color.White)
      .zIndex(10)

      // 2. 中间抽屉区域 (使用 Column 分割上下)
      Column() {

        // --- A. 上半部分：WebView 编辑器 ---
        // 【核心修复】将 Column 换成 Stack！
        // Stack 会强制子组件填满自己，防止 WebView 塌陷
        Stack() {
          FormulaWebView({
            latexString: this.store.getDisplayLatex()
          })
        }
        .width('100%')
        // 通过权重控制 Stack 的高度，Stack 会自动拉伸内部的 WebView
        .layoutWeight(this.isEditorExpanded ? 65 : 30)
        .backgroundColor(Color.White)
        .onClick(() => {
          animateTo({ duration: 300, curve: Curve.EaseOut }, () => {
            this.isKeyboardVisible = true;
          })
        })

        // --- B. 把手 (Handle) ---
        Stack({ alignContent: Alignment.Center }) {
          Divider().color('#E0E0E0').strokeWidth(1).width('100%')
          Button({ type: ButtonType.Circle, stateEffect: true }) {
            Text("⌄")
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor('#999')
              .offset({ y: -2 })
              .rotate({ angle: this.isEditorExpanded ? 180 : 0 })
              .animation({ duration: 300 })
          }
          .width(28)
          .height(28)
          .backgroundColor(Color.White)
          .shadow({ radius: 3, color: 'rgba(0,0,0,0.1)', offsetY: 1 })
          .onClick(() => {
            this.isEditorExpanded = !this.isEditorExpanded;
          })
        }
        .height(24)
        .width('100%')
        .zIndex(5)
        .backgroundColor('transparent')

        // --- C. 下半部分：结果或组件 ---
        Column() {
          if (this.bottomPreviewMode === 0) {
            // 组件模式
            Stack() { // 这里的 Scroll 外面也建议套个 Stack 保险
              Scroll() {
                FormulaView({ store: this.store })
                  .padding(10)
              }
              .align(Alignment.TopStart)
            }
            .width('100%')
            .height('100%')
            .alignContent(Alignment.TopStart)

          } else if (this.bottomPreviewMode === 1){
            // 结果模式 (预览区)
            Column() {
              // 1. 显示计算结果 (如果有)
              if (this.store.previewResult) {
                Text(this.store.previewResult)
                  .fontSize(32) // 结果字体大一点
                  .fontColor('#333')
                  .fontWeight(FontWeight.Bold)
                  .textAlign(TextAlign.Start)
                  .width('100%')
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .maxLines(1)
              }
              // 2. 如果没有结果，且公式不为空，可能在暗示用户"需要点完成"
              else if (this.store.tokens.length > 0) {
                Text("...") // 或者显示 "按 √ 计算"
                  .fontSize(24)
                  .fontColor('#CCC')
                  .margin({ top: 4 })
              }
              // 3. 空闲状态
              else {
                Text("Ready")
                  .fontSize(18)
                  .fontColor('#EEE')
              }
            }
            .width('100%')
            .height('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)
          } else {
            // Tab 2: AI 分析视图 【使用新组件】
            // 我们把 targetFormula 传给它，它会自动监听变化并请求
            AnalysisView({ latexToAnalyze: this.targetFormula })
          }
        }
        // 下半部分权重互补
        .layoutWeight(this.isEditorExpanded ? 35 : 70)
        .width('100%')
        .backgroundColor('#F5F7F9')
      }
      .layoutWeight(1) // 中间区域撑满
      .width('100%')

      // 3. 键盘区域 (带动画)
      // 使用条件渲染 + transition
      if (this.isKeyboardVisible) {
        MathKeyboard({
          store: this.store,
          // 【新增】收到收起信号
          onHide: () => {
            animateTo({ duration: 300, curve: Curve.EaseInOut }, () => {
              this.isKeyboardVisible = false;
            })
          },
          // 【新增】收到执行信号
          onExecute: () => {
            this.handleExecution();
          }
        })
        // 【关键】添加转场动画：从底部滑出
          .transition(TransitionEffect.move(TransitionEdge.BOTTOM).animation({ duration: 300 }))
      } else {
        // 4. 当键盘隐藏时，显示一个“唤起条”
        Button() {
          Row() {
            Text("⌨️")
              .fontSize(20)
              .fontColor('#555')
            Text(" 展开键盘")
              .fontSize(14)
              .fontColor('#555')
          }
        }
        .type(ButtonType.Normal)
        .backgroundColor('#EEEEEE') // 浅灰背景
        .width('100%')
        .height(40) // 矮一点，不占地
        .onClick(() => {
          animateTo({ duration: 300, curve: Curve.EaseOut }, () => {
            this.isKeyboardVisible = true;
          })
        })
        // 唤起条也可以加个动画
        .transition(TransitionEffect.move(TransitionEdge.BOTTOM).animation({ duration: 300 }))
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F7F9')
  }

  // 处理“完成”点击逻辑
  handleExecution() {
    const currentLatex = this.store.getCleanLatex(); // 或者用 getCleanLatex() 如果你加了的话
    if (!currentLatex || currentLatex.trim() === "") return;

    // 1. 设置 AI 分析的目标公式
    this.targetFormula = currentLatex;

    // 2. 自动切换到“分析”Tab
    this.bottomPreviewMode = 2;

    // 3. 【体验优化】自动收起键盘，展示全屏分析结果
    animateTo({ duration: 300, curve: Curve.EaseInOut }, () => {
      this.isKeyboardVisible = false;
    });
  }

  // SegmentButton 保持不变...
  @Builder
  SegmentButton(text: string, index: number) {
    Button({ type: ButtonType.Normal, stateEffect: false }) {
      Text(text)
        .fontSize(14)
        .fontWeight(this.bottomPreviewMode === index ? FontWeight.Medium : FontWeight.Normal)
        .fontColor(this.bottomPreviewMode === index ? '#000000' : '#888888')
    }
    .backgroundColor(this.bottomPreviewMode === index ? Color.White : 'transparent')
    .borderRadius(18)
    .height(28)
    .padding({ left: 16, right: 16 })
    .shadow(this.bottomPreviewMode === index ? { radius: 2, color: 'rgba(0,0,0,0.1)', offsetY: 1 } : undefined)
    .onClick(() => {
      this.bottomPreviewMode = index;
    })
  }
}