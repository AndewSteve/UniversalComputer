// components/AnalysisView.ets
import { AnalysisStore, analysisStore } from '../viewmodel/AnalysisStore';
import { AiResponse, AiService, AnalysisProperty } from '../viewmodel/core/AiService';
import { promptAction } from '@kit.ArkUI';

@Component
export struct AnalysisView {
  @Prop @Watch('onFormulaChange') latexToAnalyze: string = "";
  @State store: AnalysisStore = analysisStore;

  aboutToAppear() { this.checkAndAnalyze(); }
  onFormulaChange() { this.checkAndAnalyze(); }

  checkAndAnalyze() {
    this.store.analyze(this.latexToAnalyze);
  }

  build() {
    Column() {
      if (this.store.isLoading) {
        this.LoadingView();
      } else if (this.store.errorMessage) {
        this.ErrorView();
      } else if (this.store.resultData) {
        // --- 核心：结构化结果展示 ---
        Scroll() {
          Column({ space: 16 }) {
            this.ResultCard(this.store.resultData!)

            if (this.store.resultData!.properties?.length > 0) {
              this.PropertiesCard(this.store.resultData!.properties)
            }

            if (this.store.resultData!.steps?.length > 0) {
              this.StepsCard(this.store.resultData!.steps)
            }
          }
          .padding(16)
          .width('100%')
        }
        .align(Alignment.TopStart)
        .layoutWeight(1)
      } else {
        this.EmptyView();
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F7F9') // 浅灰背景
  }

  // === 子组件：结果卡片 ===
  @Builder ResultCard(data: AiResponse) {
    Column() {
      // 1. 类型标签
      Text(data.type)
        .fontSize(14)
        .fontColor('#2D9CDB')
        .backgroundColor('#E6F7FF')
        .padding({ left: 8, right: 8, top: 4, bottom: 4 })
        .borderRadius(4)
        .margin({ bottom: 8 })

      // 2. 最终结果 (这里如果是复杂公式，理想情况是用 Webview 渲染，现在先用 Text 兜底)
      // 注意：为了好看，这里直接显示 LaTeX 源码或简化文本
      Text("Result:")
        .fontSize(12).fontColor('#888').margin({ bottom: 4 })

      Text(data.result_latex)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333')
        .copyOption(CopyOptions.LocalDevice)

      // 3. 总结
      if (data.summary) {
        Text(data.summary)
          .fontSize(14).fontColor('#666').margin({ top: 12 })
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({ radius: 4, color: 'rgba(0,0,0,0.05)', offsetY: 2 })
    .alignItems(HorizontalAlign.Start)
  }

  // === 子组件：属性分析 ===
  @Builder
  PropertiesCard(props: AnalysisProperty[]) {
    Column() {
      Text("分析属性")
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 12 })

      // 使用显式类型 AnalysisProperty
      ForEach(props, (item: AnalysisProperty, index: number) => {
        Row() {
          Text(item.label)
            .width(80)
            .fontSize(14)
            .fontColor('#666')

          // 如果 value 是 latex，实际项目中可以用 FormulaWebView 渲染
          // 这里暂时用 Text 兜底
          Text(item.value_latex)
            .fontSize(14)
            .fontColor('#333')
            .fontWeight(FontWeight.Medium)
            .layoutWeight(1)
        }
        .width('100%')
        .padding({ top: 8, bottom: 8 })
        .border({ width: { bottom: 1 }, color: '#F0F0F0' })
      }, (item: AnalysisProperty) => item.label + item.value_latex) // Key 生成策略
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({ radius: 4, color: 'rgba(0,0,0,0.05)', offsetY: 2 })
    .alignItems(HorizontalAlign.Start)
  }

  // === 子组件：解题步骤 ===
  @Builder StepsCard(steps: string[]) {
    Column() {
      Text("求解步骤").fontSize(16).fontWeight(FontWeight.Bold).margin({ bottom: 12 })

      ForEach(steps, (step: string, index: number) => {
        Row() {
          Text(`${index + 1}.`)
            .fontSize(14)
            .fontColor('#2D9CDB')
            .width(24)
            .margin({ top: 2 }) // 对齐
          Text(step)
            .fontSize(14)
            .fontColor('#444')
            .layoutWeight(1)
            .lineHeight(22)
        }
        .alignItems(VerticalAlign.Top)
        .margin({ bottom: 12 })
      })
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({ radius: 4, color: 'rgba(0,0,0,0.05)', offsetY: 2 })
    .alignItems(HorizontalAlign.Start)
  }

  // === Loading / Error / Empty Views (保持简单) ===
  @Builder LoadingView() {
    Column({ space: 10 }) {
      LoadingProgress().width(40).height(40).color('#2D9CDB')
      Text("正在进行数学推导...").fontSize(14).fontColor('#999')
    }
    .width('100%').height('100%').justifyContent(FlexAlign.Center)
  }

  @Builder ErrorView() {
    Column({ space: 10 }) {
      Text("⚠️").fontSize(40)
      Text(this.store.errorMessage)
        .fontSize(14)
        .fontColor('#FF4D4F')
        .textAlign(TextAlign.Center)
        .padding({ left: 20, right: 20 })

      // 诊断按钮
      Button("网络诊断 (Ping cloudflare)", { type: ButtonType.Normal, stateEffect: true })
        .fontSize(12)
        .fontColor('#2D9CDB')
        .backgroundColor('transparent')
        .margin({ top: 20 })
        .onClick(() => {
          this.runNetworkTest();
        })
    }
    .width('100%').height('100%').justifyContent(FlexAlign.Center)
  }

  @Builder EmptyView() {
    Column({ space: 20 }) {
      Text("点击键盘上的 ✓ 开始分析")
        .fontSize(16).fontColor('#CCC')

      // 这是一个仅开发阶段可见的调试入口
      Text("网络连通性测试 >")
        .fontSize(12)
        .fontColor('#E0E0E0')
        .onClick(() => {
          this.runNetworkTest();
        })
    }
    .width('100%').height('100%').justifyContent(FlexAlign.Center)
  }

  // 执行测试并弹窗
  async runNetworkTest() {
    promptAction.showToast({ message: '正在尝试连接 Bing...', duration: 2000 });

    const result = await AiService.checkConnectivity();

    AlertDialog.show({
      title: '网络诊断报告',
      message: result,
      confirm: {
        value: '关闭',
        action: () => {}
      }
    });
  }
}