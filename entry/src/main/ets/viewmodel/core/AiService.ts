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

  static async analyzeFormula(latex: string): Promise<{ success: boolean, data?: AiResponse, error?: string }> {
    if (!latex || latex.trim() === "") {
      return { success: false, error: "公式不能为空" };
    }

    try {
      console.info(`[AGC] Calling Cloud Function: ${this.AGC_TRIGGER_URI}`);

      const functionCallable = agconnect.function().wrap(AiService.AGC_TRIGGER_URI);

      // 【关键修改】 DeepSeek 思考比较慢，建议设为 30s 或 60s
      functionCallable.timeout = 60000;

      const result = await functionCallable.call({
        latex: latex
      });

      const responseBody = result.getValue();
      // console.info(`[AGC] Response: ${JSON.stringify(responseBody)}`);

      // 兼容 DeepSeek 的不同返回格式 (content 有时在 message 里，有时在 choices 里)
      const deepSeekContent = responseBody.choices?.[0]?.message?.content || responseBody.content;

      if (deepSeekContent) {
        try {
          const parsedData = JSON.parse(deepSeekContent) as AiResponse;
          return { success: true, data: parsedData };
        } catch (e) {
          console.error("JSON Parse Error", e);
          // 如果 AI 返回了不是 JSON 的纯文本（偶尔发生），也要友好提示
          return { success: false, error: "AI 返回格式异常，请重试" };
        }
      }

      return { success: false, error: "AI 未返回有效内容" };

    } catch (err: any) {
      console.error('AI Service Error:', JSON.stringify(err));

      // 【关键修改】 细化错误提示
      let friendlyMsg = "服务暂时不可用";
      const errStr = JSON.stringify(err);

      // 华为 AGC SDK 的超时错误码通常包含 'timeout' 或特定 Code
      if (errStr.includes("timeout") || err.code === 203818064) {
        friendlyMsg = "AI 思考超时 (超过60秒)，请尝试简化公式";
      } else if (errStr.includes("Network") || err.code === 203818065) {
        friendlyMsg = "网络连接失败，请检查网络";
      } else if (errStr.includes("203818130")) {
        friendlyMsg = "签名校验失败 (请检查 AGC 配置)";
      }

      return { success: false, error: friendlyMsg };
    }
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