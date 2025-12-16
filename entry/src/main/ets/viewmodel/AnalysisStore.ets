// viewmodel/AnalysisStore.ts
import { AiService, AiResponse } from './core/AiService';

@Observed
export class AnalysisStore {
  // 以前是 string，现在是对象
  public resultData: AiResponse | null = null;
  public isLoading: boolean = false;
  public errorMessage: string = "";

  // 【新增】动态加载提示语
  public loadingText: string = "正在连接 AI...";

  private lastAnalyzedFormula: string = "";

  private loadingTimer: number = -1; // 定时器 ID

  public async analyze(formula: string, forceRefresh: boolean = false) {
    if (!formula || formula.trim() === "") return;

    if (!forceRefresh && formula === this.lastAnalyzedFormula && this.resultData) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = "";
    this.resultData = null;
    this.lastAnalyzedFormula = formula;

    // 【新增】启动“安抚”定时器
    this.startLoadingAnimation();

    // 调用 Service (注意这里适配了新的返回值结构)
    const res = await AiService.analyzeFormula(formula);

    // 清除定时器
    this.stopLoadingAnimation();

    if (res.success && res.data) {
      this.resultData = res.data;
    } else {
      // 显示具体的错误信息 (比如“超时”或“断网”)
      this.errorMessage = res.error || "分析失败，未知错误";
    }

    this.isLoading = false;
  }

  // --- 动态文案逻辑 ---
  private startLoadingAnimation() {
    this.loadingText = "正在识别公式...";
    let seconds = 0;

    // 清除旧的 (防止连点)
    if (this.loadingTimer !== -1) clearInterval(this.loadingTimer);

    this.loadingTimer = setInterval(() => {
      seconds++;
      if (seconds > 2 && seconds <= 5) {
        this.loadingText = "AI 正在深度思考...";
      } else if (seconds > 5 && seconds <= 12) {
        this.loadingText = "正在推导解题步骤...";
      } else if (seconds > 12 && seconds <= 20) {
        this.loadingText = "计算量较大，请耐心等待...";
      } else if (seconds > 20) {
        this.loadingText = "即将完成，请勿关闭...";
      }
    }, 1000);
  }

  private stopLoadingAnimation() {
    if (this.loadingTimer !== -1) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = -1;
    }
  }

  public clear() {
    this.resultData = null;
    this.lastAnalyzedFormula = "";
    this.isLoading = false;
    this.errorMessage = "";
    this.stopLoadingAnimation();
  }
}

export const analysisStore = new AnalysisStore();