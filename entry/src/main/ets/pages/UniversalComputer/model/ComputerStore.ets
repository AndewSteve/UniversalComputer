import { create, all } from 'mathjs';

// 初始化 mathjs
const math = create(all, {
  number: 'BigNumber', // 使用高精度
  precision: 64
});

// 标记为可观察对象，UI 可以监听它的变化
@Observed
export class ComputerStore {
  // 状态数据
  public logs: string[] = [];
  public currentInput: string = "x^2 + 2x";

  // Action: 添加日志
  addLog(content: string) {
    // 插入到数组最前面
    this.logs.unshift(content);
  }

  // Action: 执行求导 (Symbolic Differentiation)
  solveDerivative() {
    try {
      if (!this.currentInput) return;
      const res = math.derivative(this.currentInput, 'x').toString();
      this.addLog(`[求导] d/dx (${this.currentInput}) = ${res}`);
    } catch (e) {
      this.addLog(`[错误] ${e.message}`);
    }
  }

  // Action: 执行化简 (Simplify)
  solveSimplify() {
    try {
      if (!this.currentInput) return;
      const res = math.simplify(this.currentInput).toString();
      this.addLog(`[化简] ${this.currentInput} = ${res}`);
    } catch (e) {
      this.addLog(`[错误] ${e.message}`);
    }
  }

  // Action: 矩阵示例 (为了演示复杂计算)
  runMatrixDemo() {
    try {
      const a = math.matrix([[1, 2], [3, 4]]);
      const det = math.det(a); // 行列式
      this.addLog(`[矩阵] Det([[1,2],[3,4]]) = ${det}`);
    } catch (e) {
      this.addLog(`[矩阵错误] ${e.message}`);
    }
  }

  // Action: 清除日志
  clearLogs() {
    this.logs = [];
  }
}