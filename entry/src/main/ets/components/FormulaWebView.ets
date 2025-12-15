// components/FormulaWebView.ets
import { webview } from '@kit.ArkWeb';
import { AppColors } from '../common/values/AppColors';

@Component
export struct FormulaWebView {
  // 接收 LaTeX 字符串
  @Prop @Watch('onLatexChange') latexString: string;

  controller: webview.WebviewController = new webview.WebviewController();
  isPageLoaded: boolean = false;

  build() {
    // 建议加个 Stack 给个白色背景，防止加载闪烁
    Stack() {
      Web({
        src: 'resource://rawfile/latex/index.html', // 【关键修改】：加载本地文件
        controller: this.controller
      })
        .width('100%')
        .height('100%')
        .backgroundColor(Color.White) // Web组件背景透明
        .onConsole((event) => {
          // 方便在 Logcat 里看 JS 的报错
          console.info('[WebView Console]:', event?.message.getMessage());
          return false;
        })
        .onPageEnd(() => {
          // 页面加载完成（包括 katex.js 读取完毕）
          this.isPageLoaded = true;
          console.info('WebView Page Loaded');
          // 立即刷新一次当前公式
          this.onLatexChange();
        })
        // 允许文件访问（通常 rawfile 默认允许，但显式开启更保险）
        .fileAccess(true)
        .domStorageAccess(true)
    }
    .backgroundColor(AppColors.TEXT_WHITE) // 底层放个白色背景
  }

  onLatexChange() {
    // 只有当 HTML 加载完，且 controller 准备好后才执行
    if (this.isPageLoaded) {
      try {
        // 1. 转义反斜杠 (JS 字符串中 \ 必须转义为 \\)
        let escaped = this.latexString.replace(/\\/g, '\\\\');
        // 2. 转义单引号 (防止截断 JS 字符串 '...')
        escaped = escaped.replace(/'/g, "\\'");
        // 3. 处理换行符
        escaped = escaped.replace(/\n/g, "");

        // 调用我们在 window 上挂载的函数
        this.controller.runJavaScript(`window.updateFormula('${escaped}')`).catch(() => {
          // TODO: Implement error handling.
        });
      } catch (e) {
        console.error("ArkTS -> JS Error:", JSON.stringify(e));
      }
    }
  }
}