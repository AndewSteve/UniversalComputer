// components/AnalysisResultComponent.ets
import { webview } from '@kit.ArkWeb';
import { AiResponse } from '../viewmodel/core/AiService';

@Component
export struct AnalysisResultComponent {
  // 接收 AI 数据对象
  @Prop @Watch('onDataChange') resultData: AiResponse | null = null;

  controller: webview.WebviewController = new webview.WebviewController();
  isReady: boolean = false;

  build() {
    Web({ src: '', controller: this.controller })
      .width('100%')
      .height('100%')
      .backgroundColor('#F5F7F9') // 背景色衔接
      .onConsole((event) => {
        console.info('[ReportWeb]', event?.message.getMessage());
        return false;
      })
      .onPageEnd(() => {
        this.isReady = true;
        this.renderData();
      })
      .onAppear(() => {
        // 加载本地 HTML
        setTimeout(() => {
          try {
            this.controller.loadUrl('resource://rawfile/latex/report.html');
          } catch(e) {}
        }, 50);
      })
  }

  onDataChange() {
    this.renderData();
  }

  renderData() {
    if (!this.isReady || !this.resultData) return;

    try {
      // 传递 JSON 数据给 JS
      const jsonStr = JSON.stringify(this.resultData);
      // 调用 window.renderReport
      this.controller.runJavaScript(`window.renderReport(${jsonStr})`);
    } catch (e) {
      console.error("Render Report Error", JSON.stringify(e));
    }
  }
}