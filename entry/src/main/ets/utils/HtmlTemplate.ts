// utils/HtmlTemplate.ts

export const KATEX_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: flex-end; /* 右对齐，像计算器一样 */
            align-items: center;
            min-height: 100vh;
            background-color: transparent; /* 透明背景 */
            box-sizing: border-box;
            overflow-x: auto; /* 允许横向滚动 */
        }
        #formula-container {
            font-size: 3em; /* 字体大一点 */
            color: #000;
        }
        /* 自定义光标样式：闪烁的红色竖线 */
        .cursor-blink {
            color: #FF0055;
            animation: blink 1s step-end infinite;
            font-weight: 100;
            margin: 0 2px;
        }
        @keyframes blink {
            from, to { opacity: 1; }
            50% { opacity: 0; }
        }
        /* 错误处理 */
        .katex-error {
            color: red;
            font-size: 0.8em;
        }
    </style>
</head>
<body>
    <div id="formula-container"></div>

    <script>
        // 更新公式的入口函数
        function updateFormula(latex) {
            const container = document.getElementById('formula-container');
            try {
                // 使用 KaTeX 渲染
                katex.render(latex, container, {
                    throwOnError: false,
                    displayMode: true, // 显示模式 (更漂亮的排版)
                    strict: false
                });

                // 渲染完成后，自动滚动到最右边 (跟随光标)
                window.scrollTo(document.body.scrollWidth, 0);
            } catch (e) {
                container.innerText = "Error: " + e.message;
            }
        }
    </script>
</body>
</html>
`;