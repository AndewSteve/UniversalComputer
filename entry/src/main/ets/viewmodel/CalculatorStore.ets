// viewmodel/CalculatorStore.ts
import { FormulaToken, ScopeRange } from '../model/FormulaToken';
import { KeyModel, KeyAction } from '../model/KeyModel';
import { CursorLogic } from './core/CursorLogic';
import { EditLogic } from './core/EditLogic';
import { RenderLogic } from './core/RenderLogic';
import { SelectionLogic } from './core/SelectionLogic';
import { HistoryLogic, EditorSnapshot } from './core/HistoryLogic'; // 假设你也把 History 拆了
import { CalculationService } from './core/CalculationService';
import { myLogger } from "../common/values/MyLogger";

@Observed
export class CalculatorStore {
  // 专门用于显示在预览区的结果
  public previewResult: string = "";

  public tokens: FormulaToken[] = [];
  public cursorIndex: number = 0;
  //
  // // 选区相关
  public selectionStart: number = -1;
  public selectionEnd: number = -1;
  //
  // // 历史管理 (可以直接在这里 new，或者也做成 static 工具)
  private historyLogic: HistoryLogic = new HistoryLogic();

  // 【新增】角度模式状态 (false: Rad, true: Deg)
  public isDegree: boolean = false;

  constructor() {
    console.info("this is console output");
    myLogger.log("this is hilog output");
    this.tokens = [];
    this.cursorIndex = 0;
  }

  public toggleAngleMode() {
    this.isDegree = !this.isDegree;
    // 切换后立即重新触发计算
    this.tryRealTimeCalculation();
  }

  public handleInput(key: KeyModel) {
    // 1. 处理历史快照 (Undo/Redo 前置逻辑)
    if (this.isModification(key.action)) {
      this.historyLogic.pushSnapshot({
        tokens: [...this.tokens],
        cursorIndex: this.cursorIndex,
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd
      });

      // 处理选区覆盖
      if (this.hasSelection()) {
        this.cursorIndex = EditLogic.deleteRange(this.tokens, this.selectionStart, this.selectionEnd);
        this.clearSelection();
        if (key.action === KeyAction.DELETE) {
          this.tryRealTimeCalculation();
          return;
        }
      }
    }

    // 2. 路由分发
    switch (key.action) {
      case KeyAction.INSERT:
        // 委托给 EditLogic
        this.cursorIndex = EditLogic.insert(this.tokens, this.cursorIndex, key);
        break;

      case KeyAction.DELETE:
        this.cursorIndex = EditLogic.backspace(this.tokens, this.cursorIndex);
        break;

      case KeyAction.NAV_LEFT:
        this.clearSelection();
        // 委托给 CursorLogic
        this.cursorIndex = CursorLogic.calculateMove(this.tokens, this.cursorIndex, -1);
        break;

      case KeyAction.NAV_RIGHT:
        this.clearSelection();
        this.cursorIndex = CursorLogic.calculateMove(this.tokens, this.cursorIndex, 1);
        break;

      // 【新增】上下导航
      case KeyAction.NAV_UP:
        this.clearSelection();
        this.cursorIndex = CursorLogic.moveVertically(this.tokens, this.cursorIndex, -1);
        break;

      case KeyAction.NAV_DOWN:
        this.clearSelection();
        this.cursorIndex = CursorLogic.moveVertically(this.tokens, this.cursorIndex, 1);
        break;

      case KeyAction.CLEAR:
        this.tokens = [];
        this.cursorIndex = 0;
        this.clearSelection();
        break;

      case KeyAction.SELECT_EXPAND:
        // 选区扩展逻辑比较复杂，可以保留在这里，或者提取到 SelectionLogic.ts
        this.expandSelection();
        break;
      case KeyAction.EXECUTE:
        console.info("Execute Calculation (Not Implemented)");
        break;
    }
    this.tryRealTimeCalculation();
  }

  // Undo/Redo 代理
  public undo() {
    const state = this.historyLogic.undo(this.getCurrentSnapshot());
    if (state) this.restoreState(state);
  }

  public redo() {
    const state = this.historyLogic.redo(this.getCurrentSnapshot());
    if (state) this.restoreState(state);
  }

  // 渲染代理
  public getDisplayLatex(): string {
    // return "";
    return RenderLogic.generateDisplayLatex(this.tokens, this.cursorIndex);
  }

  // 【新增】获取发给 AI 的纯净公式
  public getCleanLatex(): string {
    // return "";
    return RenderLogic.generateCleanLatex(this.tokens);
  }

  // --- 辅助方法 ---

  private isModification(action: KeyAction): boolean {
    return action === KeyAction.INSERT || action === KeyAction.DELETE || action === KeyAction.CLEAR;
  }

  public isIndexSelected(index: number): boolean {
    // return false;
    // 如果没有选区，直接返回 false
    if (!this.hasSelection()) {
      return false;
    }
    // 判断 index 是否在 [start, end) 区间内
    return index >= this.selectionStart && index < this.selectionEnd;
  }

  private hasSelection(): boolean {
    // return false;
    return this.selectionStart !== -1 && this.selectionEnd !== -1 && this.selectionStart < this.selectionEnd;
  }

  private clearSelection() {
    this.selectionStart = -1;
    this.selectionEnd = -1;
  }

  public clearAll() {
    // 1. 如果需要支持“撤销清空”，在这里保存快照
    this.historyLogic.pushSnapshot(this.getCurrentSnapshot());

    // 2. 执行清空
    this.tokens = [];
    this.cursorIndex = 0;
    this.clearSelection();
  }

  private getCurrentSnapshot(): EditorSnapshot {
    return {
      tokens: [...this.tokens],
      cursorIndex: this.cursorIndex,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd
    };
  }

  private restoreState(state: EditorSnapshot) {
    this.tokens = state.tokens;
    this.cursorIndex = state.cursorIndex;
    this.selectionStart = state.selectionStart;
    this.selectionEnd = state.selectionEnd;
  }

  // expandSelection 逻辑暂时保留或同样移出
  private expandSelection() {
    const newRange: ScopeRange = SelectionLogic.expandSelection(
      this.tokens,
      this.cursorIndex,
      this.selectionStart,
      this.selectionEnd
    );
    this.selectionStart = newRange.start;
    this.selectionEnd = newRange.end;
  }

  /**
   * 尝试实时计算
   */
  private tryRealTimeCalculation() {
    // return;
    // 如果没有 Token，清空预览
    if (this.tokens.length === 0) {
      this.previewResult = "";
      return;
    }

    // 调用服务
    const result = CalculationService.evaluateRealTime(this.tokens, this.isDegree);

    if (result !== null) {
      // 计算成功，显示 "= 结果"
      this.previewResult = "= " + result;
    } else {
      // 计算失败（公式未完成或包含复杂符号），清空预览或显示占位
      // 这里留空，让 UI 显示空白或者 "..."
      this.previewResult = "";
    }
  }

  // 处理 EXECUTE (点击右下角对钩)
  // 这是用户强制要求计算，此时可以处理更复杂的逻辑 (比如调用 Python 后端，或本地更强的引擎)
  public handleExecute() {
    // TODO: 这里处理带有 \int, \sum 的复杂计算
    console.info("Full calculation triggered");
  }
}

export const calculatorStore = new CalculatorStore();