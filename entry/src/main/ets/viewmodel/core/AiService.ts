// viewmodel/core/AiService.ts
import http from '@ohos.net.http';
import { APP_SECRET } from '../../common/AppSecret';

// --- 1. 恢复接口定义 (方便其他文件复用) ---
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

  // --- 2. 核心分析方法 (直连模式 + 人性化错误处理) ---
  static async analyzeFormula(latex: string): Promise<{ success: boolean, data?: AiResponse, error?: string }> {
    if (!latex || latex.trim() === "") {
      return { success: false, error: "公式不能为空" };
    }

    try {
      console.info('[AiService] Starting DeepSeek Analysis...');

      // 创建 HTTP 请求
      const httpRequest = http.createHttp();

      const response = await httpRequest.request(
        APP_SECRET.API_URL,
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${APP_SECRET.DEEPSEEK_API_KEY}`
          },
          extraData: {
            model: "deepseek-chat",
            messages: [
              { role: "system", content: APP_SECRET.AI_SYSTEM_PROMPT },
              { role: "user", content: `Analyze: ${latex}` }
            ],
            temperature: 0.1,
            stream: false
          },
          // 【关键】保留 60s 超时设置
          readTimeout: 60000,
          connectTimeout: 60000
        }
      );

      // --- 3. 处理响应 (兼容 DeepSeek 格式) ---
      if (response.responseCode === 200) {
        const resStr = response.result as string;
        const resJson = JSON.parse(resStr);

        // 获取内容 (DeepSeek 标准格式)
        const aiContent = resJson.choices?.[0]?.message?.content;

        if (aiContent) {
          try {
            // 清洗 Markdown 标记 (防止 AI 返回 ```json)
            const cleanContent = this.cleanMarkdown(aiContent);
            const parsedData = JSON.parse(cleanContent) as AiResponse;
            return { success: true, data: parsedData };
          } catch (e) {
            console.error("JSON Parse Error", e);
            return { success: false, error: "AI 返回格式异常，正在重试..." };
          }
        }
        return { success: false, error: "AI 未返回有效内容" };

      } else {
        // HTTP 状态码错误处理
        if (response.responseCode === 401) return { success: false, error: "API Key 无效，请检查配置" };
        if (response.responseCode === 429) return { success: false, error: "请求过于频繁，请稍后再试" };
        if (response.responseCode >= 500) return { success: false, error: "DeepSeek 服务繁忙，请稍后" };
        return { success: false, error: `请求失败 (Code: ${response.responseCode})` };
      }

    } catch (err: any) {
      console.error('[AiService] Error:', JSON.stringify(err));

      // --- 4. 【恢复】人性化错误提示 ---
      let friendlyMsg = "服务暂时不可用";
      const errStr = JSON.stringify(err);

      // 鸿蒙 HTTP 模块的错误码判断
      // 2300005: 连接超时, 2300006: 无法解析域名
      if (errStr.includes("timeout") || err.code === 2300005) {
        friendlyMsg = "AI 思考超时 (超过60秒)，请尝试简化公式";
      } else if (errStr.includes("Network") || err.code === 2300006 || err.code === 2300025) {
        friendlyMsg = "网络连接失败，请检查模拟器网络";
      } else if (errStr.includes("SSL")) {
        friendlyMsg = "安全连接建立失败 (SSL握手错误)";
      }

      return { success: false, error: friendlyMsg };
    }
  }

  // --- 5. 辅助：清洗 Markdown ---
  private static cleanMarkdown(text: string): string {
    let clean = text.trim();
    // 去掉开头的 ```json 或 ```
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '');
    }
    // 去掉结尾的 ```
    if (clean.endsWith('```')) {
      clean = clean.replace(/```$/, '');
    }
    return clean.trim();
  }

  // --- 6. 【恢复】网络自检功能 (调试用) ---
  static async checkConnectivity(): Promise<string> {
    const testUrl = "https://www.bing.com";
    try {
      const httpRequest = http.createHttp();
      const response = await httpRequest.request(testUrl, {
        method: http.RequestMethod.HEAD, // 用 HEAD 更快
        connectTimeout: 5000,
        readTimeout: 5000
      });

      if (response.responseCode === 200) {
        return `✅ 网络正常 (Code: 200)`;
      } else {
        return `⚠️ 网络连通但异常: ${response.responseCode}`;
      }
    } catch (err) {
      return `❌ 网络不通: ${JSON.stringify(err)}`;
    }
  }
}