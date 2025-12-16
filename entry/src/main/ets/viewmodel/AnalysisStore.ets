// viewmodel/AnalysisStore.ts
import { AiService, AiResponse } from './core/AiService';

@Observed
export class AnalysisStore {
  // 以前是 string，现在是对象
  public resultData: AiResponse | null = null;
  public isLoading: boolean = false;
  public errorMessage: string = "";

  private lastAnalyzedFormula: string = "";

  public async analyze(formula: string, forceRefresh: boolean = false) {
    if (!formula || formula.trim() === "") return;

    if (!forceRefresh && formula === this.lastAnalyzedFormula && this.resultData) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = "";
    this.resultData = null; // 清空旧数据
    this.lastAnalyzedFormula = formula;

    const data = await AiService.analyzeFormula(formula);

    if (data) {
      this.resultData = data;
    } else {
      this.errorMessage = "分析失败，请检查网络或公式输入";
    }

    this.isLoading = false;
  }

  public clear() {
    this.resultData = null;
    this.lastAnalyzedFormula = "";
    this.isLoading = false;
    this.errorMessage = "";
  }
}

export const analysisStore = new AnalysisStore();