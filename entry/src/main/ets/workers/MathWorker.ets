// entry/src/main/ets/workers/MathWorker.ets
import { MessageEvents, ThreadWorkerGlobalScope, worker } from '@kit.ArkTS';
import { create, all } from 'mathjs';

const workerPort: ThreadWorkerGlobalScope = worker.workerPort;

// 【修复1】使用 ESObject 兼容 mathjs 的 JS 对象实例
// 在 ArkTS 中，来自 npm 的 JS 库对象必须标记为 ESObject
let mathInstance: ESObject | null = null;

try {
  mathInstance = create(all, {
    number: 'BigNumber',
    precision: 64
  });
} catch (e) {
  // 初始化失败忽略
}

// 【修复2】定义严格的消息载荷接口，替代 Record<string, any>
interface WorkerPayload {
  action: string;
  expression: string;
  isDegree: boolean;
}

interface WorkerResponse {
  action: string;
  result: string | null;
}

workerPort.onmessage = (e: MessageEvents) => {
  // 【修复3】使用接口进行类型断言
  const data = e.data as WorkerPayload;
  const action = data.action;

  if (action === 'calculate') {
    const expr = data.expression;
    const isDegree = data.isDegree;

    const result = calculate(expr, isDegree);

    const response: WorkerResponse = {
      action: 'result',
      result: result
    };
    workerPort.postMessage(response);
  }
}

function calculate(expression: string, isDegree: boolean): string | null {
  if (!mathInstance || !expression) return null;

  try {
    // 【修复4】Scope 中的函数参数和返回值都涉及 JS 对象，需使用 ESObject
    const scope: Record<string, ESObject> = {
      // 三角函数
      "sin": (x: ESObject): ESObject => isDegree ? mathInstance.sin(mathInstance.unit(x, 'deg')) : mathInstance.sin(x),
      "cos": (x: ESObject): ESObject => isDegree ? mathInstance.cos(mathInstance.unit(x, 'deg')) : mathInstance.cos(x),
      "tan": (x: ESObject): ESObject => isDegree ? mathInstance.tan(mathInstance.unit(x, 'deg')) : mathInstance.tan(x),

      // 直接映射的函数
      "log": mathInstance.log,
      "log10": mathInstance.log10,
      "sqrt": mathInstance.sqrt,
      "nthRoot": mathInstance.nthRoot,

      // 常量
      "pi": mathInstance.pi,
      "e": mathInstance.e
    };

    const res: ESObject = mathInstance.evaluate(expression, scope);

    // format 返回的是 string，这里可以安全转换
    return mathInstance.format(res, { precision: 10, lowerExp: -9, upperExp: 9 }) as string;
  } catch (e) {
    return null;
  }
}