// viewmodel/core/AiService.ts
import agconnect from '@hw-agconnect/api-ohos';
import http from '@ohos.net.http';

// 定义接口，方便其他文件复用
export interface AnalysisProperty {
  label: string;
  value_latex: string;
}

export interface AiResponse {
  type: string;
  result_latex: string;
  steps: string[];
  properties: AnalysisProperty[];
  summary: string;
}

export class AiService {
  // 替换为你部署好的 CF Worker 地址
  private static readonly AGC_TRIGGER_URI = 'analysis-latex-$latest';

  static async analyzeFormula(latex: string): Promise<AiResponse | null> {
    if (!latex || latex.trim() === "") return null;

    try {
      console.info(`[AGC] Input Latex: ${latex}`);
      console.info(`[AGC] Calling Cloud Function: ${this.AGC_TRIGGER_URI}`);

      const functionCallable = agconnect
        .function()
        .wrap(AiService.AGC_TRIGGER_URI);
      functionCallable.timeout = 10000;

      const result = await functionCallable.call({
        latex: latex
      });

      const responseBody = result.getValue();
      console.info(`[AGC] Response: ${JSON.stringify(responseBody)}`);

      const deepSeekContent = responseBody.choices?.[0]?.message?.content;

      if (deepSeekContent) {
        return JSON.parse(deepSeekContent) as AiResponse;
      }
    } catch (err) {
      console.error('AI Service Error:', JSON.stringify(err));
    }
    return null;
  }

  /**
   * 【新增】网络连通性自检
   * 访问 bing.com，返回详细的调试日志
   */
  static async checkConnectivity(): Promise<string> {
    const testUrl = "https://www.bing.com";
    try {
      const httpRequest = http.createHttp();

      // 发起 HEAD 或 GET 请求，超时设短一点 (5秒)
      const response = await httpRequest.request(testUrl, {
        method: http.RequestMethod.GET,
        expectDataType: http.HttpDataType.STRING,
        connectTimeout: 5000,
        readTimeout: 5000
      });

      if (response.responseCode === 200) {
        return `✅ 网络正常 (Code: 200)\n成功连接到 ${testUrl}`;
      } else {
        return `⚠️ 网络连通，但状态码异常: ${response.responseCode}\nURL: ${testUrl}`;
      }

    } catch (err) {
      // 捕获底层网络错误
      const code = err.code ? `Code: ${err.code}` : 'No Code';
      const msg = err.message || 'Unknown Error';

      // 常见错误分析
      let advice = "";
      if (code.includes("2300006") || msg.includes("Host")) advice = "-> DNS 解析失败，模拟器无网。请检查 Wifi 设置。";
      else if (code.includes("2300005") || msg.includes("Timeout")) advice = "-> 连接超时，可能是被墙或网络极慢。";
      else if (code.includes("SSL")) advice = "-> 证书校验失败 (模拟器常见问题)。";

      return `❌ 网络连接失败\n${code}\n${msg}\n${advice}`;
    }
  }
}