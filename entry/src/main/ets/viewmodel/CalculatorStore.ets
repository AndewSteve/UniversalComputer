// viewmodel/CalculatorStore.ts
import { FormulaToken, ScopeRange } from '../model/FormulaToken';
import { KeyModel, KeyAction } from '../model/KeyModel';
import { CursorLogic } from './core/CursorLogic';
import { EditLogic } from './core/EditLogic';
import { RenderLogic } from './core/RenderLogic';
import { SelectionLogic } from './core/SelectionLogic';
import { HistoryLogic, EditorSnapshot } from './core/HistoryLogic'; // 假设你也把 History 拆了

@Observed
export class CalculatorStore {
  public tokens: FormulaToken[] = [];
  public cursorIndex: number = 0;

  // 选区相关
  public selectionStart: number = -1;
  public selectionEnd: number = -1;

  // 历史管理 (可以直接在这里 new，或者也做成 static 工具)
  private historyLogic: HistoryLogic = new HistoryLogic();

  constructor() {
    this.tokens = [];
    this.cursorIndex = 0;
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
        if (key.action === KeyAction.DELETE) return;
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
    return RenderLogic.generateDisplayLatex(this.tokens, this.cursorIndex);
  }

  // --- 辅助方法 ---

  private isModification(action: KeyAction): boolean {
    return action === KeyAction.INSERT || action === KeyAction.DELETE || action === KeyAction.CLEAR;
  }

  public isIndexSelected(index: number): boolean {
    // 如果没有选区，直接返回 false
    if (!this.hasSelection()) {
      return false;
    }
    // 判断 index 是否在 [start, end) 区间内
    return index >= this.selectionStart && index < this.selectionEnd;
  }

  private hasSelection(): boolean {
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
}

export const calculatorStore = new CalculatorStore();