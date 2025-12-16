
# 📐 RISC-V Math (HarmonyOS Symbolic Calculator)> 一个基于 OpenHarmony (HarmonyOS Next) 开发的专业符号数学计算器。

本项目对标安卓平台的 **Maple Calculator**，结合了 **本地高性能 ArkUI** 与 **云端 DeepSeek 大模型**，旨在为用户提供从“所见即所得”的公式编辑到“AI 深度解析”的完整数学体验。

<table>
  <tr>
    <td><img src=".\example\LaTex.png" width="100%"></td>
    <td><img src=".\example\analysis.png" width="100%"></td>
    <td><img src=".\example\calculation.png" width="100%"></td>
  </tr>
  <tr>
    <td align="center">公式编辑</td>
    <td align="center">DeepSeek 分析</td>
    <td align="center">实时计算</td>
  </tr>
</table>

## ✨ 核心功能 (Features)
### ✅ 已完成功能
* [x] **专业的 LaTeX 公式编辑**
  * [x] 自定义数学键盘（支持 \int, \sum, \lim 等复杂符号快捷输入）
  * [x] 基于 WebView + KaTeX 的实时高保真渲染
  * [x] 光标精准定位与公式编辑

* [x] **实时结果预览**
  * [x] 内置轻量级 Math.js 引擎
  * [x] 支持基础数值计算与实时错误检测


* [x] **AI 深度数学分析 (DeepSeek V3)**
  * [x] **云端推理**：集成 DeepSeek Chat 大模型
  * [x] **结构化输出**：AI 输出严格 JSON 数据，非单纯文本对话
  * [x] **分步求解**：提供 Step-by-step 的解题步骤、定义域、零点等详细属性
  * [x] **图文混排**：分析报告页完美支持 LaTeX 公式与中文讲解混合渲染


* [x] **稳健的网络架构**
  * [x] 华为 AGC (AppGallery Connect) 云函数代理
  * [x] 解决跨域与签名问题，完美适配云端模拟器环境



### 🚧 待完善功能 (Future Work)
* [ ] 希腊字母键盘 
  * [ ] 扩展键盘布局，支持 $\alpha, \beta, \omega, \varphi, \tau$ 等物理/数学常用希腊字母的输入。

* [ ] **线性代数支持**
  * [ ] 矩阵输入 UI
  * [ ] 行列式、逆矩阵、特征值计算


* [ ] **微分方程优化**
  * [ ] 优化 y', y'' 等微分符号的输入体验


* [ ] **函数可视化**
  * [ ] 集成 Canvas/ECharts 进行函数图像绘制
  * [ ] 支持图像缩放与交互



## 🛠️ 技术架构 (Tech Stack)
* 📱 **前端**：ArkTS, ArkUI, WebView (KaTeX)
* ☁️ **后端**：华为 AppGallery Connect (AGC) 云函数 (Serverless)
* 🧠 **AI 模型**：DeepSeek Chat (V3)

## 🚀 运行说明 (Quick Start)
1. 使用 **DevEco Studio** 打开项目。
2. 等待 `Sync Project` 完成依赖下载。
3. **直接运行**：项目内置了体验用的 API Key（通过 AGC 代理），可直接在模拟器或真机上运行。
4. **(可选) 自定义 Key**：如需使用自己的 DeepSeek Key，可在应用右上角 **设置 ⚙️** 中开启“自定义模式”并填入 Key。

---