// components/FormulaWebView.ets
import { webview } from '@kit.ArkWeb';
import { AppColors } from '../common/values/AppColors';

@Component
export struct FormulaWebView {
  @Prop @Watch('onLatexChange') latexString: string;

  controller: webview.WebviewController = new webview.WebviewController();
  isControllerReady: boolean = false;

  build() {
    Stack() {
      Web({
        src: '',
        controller: this.controller
      })
        .width('100%')
        .height('100%')
        .backgroundColor(AppColors.TEXT_WHITE)
        .onConsole((event) => {
          console.info('[WebView]', event?.message.getMessage());
          return false;
        })
        .onPageEnd(() => {
          this.isControllerReady = true;
          this.onLatexChange();
        })
        .fileAccess(true)
        .domStorageAccess(true)
    }
    .width('100%')
    .height('100%')
    .alignContent(Alignment.TopStart)
    .onAppear(() => {
      setTimeout(() => {
        try {
          this.controller.loadUrl('resource://rawfile/latex/index.html');
        } catch (e) {
          console.error('LoadUrl Error:', JSON.stringify(e));
        }
      }, 50);
    })
  }

  onLatexChange() {
    if (this.isControllerReady) {
      try {
        // 【核心修改】
        // 手动添加 \displaystyle 前缀
        // 这让公式在 Inline 模式下也能保持积分号、求和号的“大尺寸”
        let finalLatex = this.latexString;
        if (!finalLatex.startsWith('\\displaystyle')) {
          finalLatex = '\\displaystyle ' + finalLatex;
        }

        const jsCode = `window.updateFormula(${JSON.stringify(finalLatex)})`;
        this.controller.runJavaScript(jsCode).catch((e: object) => {
          console.error("JS Error:", JSON.stringify(e));
        });
      } catch (e) {
        console.error("ArkTS Error:", JSON.stringify(e));
      }
    }
  }
}