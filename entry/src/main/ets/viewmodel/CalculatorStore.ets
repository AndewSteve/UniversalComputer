// viewmodel/CalculatorStore.ts
import { FormulaToken, TokenType, ScopeRange } from '../model/FormulaToken';
import { KeyModel, KeyAction } from '../model/KeyModel';
import { TokenFactory } from '../model/TokenFactory';

// 【修复】：必须定义为 interface，不能在代码里写 { ... }
export interface EditorSnapshot {
  tokens: FormulaToken[];
  cursorIndex: number;
  selectionStart: number;
  selectionEnd: number;
}

const MAX_HISTORY = 50;

@Observed
export class CalculatorStore {
  public tokens: FormulaToken[] = [];
  public cursorIndex: number = 0;

  public selectionStart: number = -1;
  public selectionEnd: number = -1;

  // 使用显式接口类型
  private historyStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];

  constructor() {
    this.tokens = [];
    this.cursorIndex = 0;
  }

  public hasSelection(): boolean {
    return this.selectionStart !== -1 && this.selectionEnd !== -1 && this.selectionStart < this.selectionEnd;
  }

  public isIndexSelected(index: number): boolean {
    if (!this.hasSelection()) return false;
    return index >= this.selectionStart && index < this.selectionEnd;
  }

  public handleInput(key: KeyModel) {
    if (this.isModificationAction(key.action)) {
      this.saveSnapshot();

      if (this.hasSelection()) {
        this.deleteSelection();
        // 如果是删除键，删完选区就结束了
        if (key.action === KeyAction.DELETE) {
          return;
        }
      }
    }

    switch (key.action) {
      case KeyAction.INSERT:
        this.insertToken(key);
        break;
      case KeyAction.DELETE:
        this.backspace();
        break;
      case KeyAction.CLEAR:
        this.clearAll();
        break;
      case KeyAction.NAV_LEFT:
        this.clearSelection();
        this.moveCursor(-1);
        break;
      case KeyAction.NAV_RIGHT:
        this.clearSelection();
        this.moveCursor(1);
        break;
      case KeyAction.SELECT_EXPAND:
        this.expandSelection();
        break;
      case KeyAction.EXECUTE:
        console.info("Execute: " + this.getRawLatex());
        break;
    }
  }

  private insertToken(key: KeyModel) {
    // 显式声明数组类型
    const tokenRes = TokenFactory.createTokens(key)
    this.tokens.splice(this.cursorIndex, 0, ...tokenRes.tokens);
    this.cursorIndex += tokenRes.offset;
  }

  private backspace() {
    if (this.cursorIndex > 0) {
      this.tokens.splice(this.cursorIndex - 1, 1);
      this.cursorIndex--;
    }
  }

  private deleteSelection() {
    if (!this.hasSelection()) return;
    const count = this.selectionEnd - this.selectionStart;
    this.tokens.splice(this.selectionStart, count);
    this.cursorIndex = this.selectionStart;
    this.clearSelection();
  }

  public clearAll() {
    this.tokens = [];
    this.cursorIndex = 0;
    this.clearSelection();
  }

  private moveCursor(delta: number) {
    const newIndex = this.cursorIndex + delta;
    if (newIndex >= 0 && newIndex <= this.tokens.length) {
      this.cursorIndex = newIndex;
    }
  }

  private clearSelection() {
    this.selectionStart = -1;
    this.selectionEnd = -1;
  }

  // ==========================================
  // 智能选区逻辑
  // ==========================================

  private expandSelection() {
    if (this.selectionStart === 0 && this.selectionEnd === this.tokens.length) {
      this.clearSelection();
      return;
    }

    let newStart = -1;
    let newEnd = -1;

    if (!this.hasSelection()) {
      // 使用 ScopeRange 接口接收返回值
      const scope: ScopeRange = this.findScope(this.cursorIndex);
      newStart = scope.start;
      newEnd = scope.end;

      if (newStart === newEnd) {
        if (this.cursorIndex > 0) {
          newStart = this.cursorIndex - 1;
          newEnd = this.cursorIndex;
        } else {
          newStart = 0;
          newEnd = this.tokens.length;
        }
      }
    } else {
      const cmdWrapper: ScopeRange | null = this.findCommandWrapper(this.selectionStart, this.selectionEnd);
      if (cmdWrapper !== null) {
        newStart = cmdWrapper.start;
        newEnd = cmdWrapper.end;
      }
      else {
        const outerScope: ScopeRange = this.findScope(this.selectionStart);
        if (outerScope.start < this.selectionStart || outerScope.end > this.selectionEnd) {
          newStart = outerScope.start;
          newEnd = outerScope.end;
        } else {
          newStart = 0;
          newEnd = this.tokens.length;
        }
      }
    }

    this.selectionStart = newStart;
    this.selectionEnd = newEnd;
  }

  // 【修复】：返回值类型明确为 ScopeRange
  private findScope(index: number): ScopeRange {
    let start = 0;
    let end = this.tokens.length;

    let balance = 0;
    for (let i = index - 1; i >= 0; i--) {
      if (this.tokens[i].value === '}') balance++;
      if (this.tokens[i].value === '{') {
        if (balance === 0) {
          start = i + 1;
          break;
        }
        balance--;
      }
    }

    balance = 0;
    for (let i = index; i < this.tokens.length; i++) {
      if (this.tokens[i].value === '{') balance++;
      if (this.tokens[i].value === '}') {
        if (balance === 0) {
          end = i;
          break;
        }
        balance--;
      }
    }

    // ArkTS 不允许直接返回字面量作为 ScopeRange，但如果结构匹配且不是复杂推断通常可以
    // 为了保险，这里显式赋值
    const result: ScopeRange = { start: start, end: end };
    return result;
  }

  // 【修复】：返回值类型明确为 ScopeRange | null
  private findCommandWrapper(s: number, e: number): ScopeRange | null {
    if (s > 1 && e < this.tokens.length) {
      const prevChar = this.tokens[s - 1];
      const prevPrevChar = this.tokens[s - 2];
      const nextChar = this.tokens[e];

      if (prevChar.value === '{' && nextChar.value === '}' && prevPrevChar.type === TokenType.COMMAND) {
        const result: ScopeRange = { start: s - 2, end: e + 1 };
        return result;
      }
    }
    return null;
  }

  private isModificationAction(action: KeyAction): boolean {
    // 数组 include 在 ArkTS 中通常可用，但某些版本可能需要显式转换
    const actions = [KeyAction.INSERT, KeyAction.DELETE, KeyAction.CLEAR];
    return actions.indexOf(action) !== -1;
  }

  private saveSnapshot() {
    // 显式构建对象
    const snapshot: EditorSnapshot = {
      tokens: [...this.tokens],
      cursorIndex: this.cursorIndex,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd
    };
    this.historyStack.push(snapshot);
    if (this.historyStack.length > MAX_HISTORY) this.historyStack.shift();
    this.redoStack = [];
  }

  public undo() {
    if (this.historyStack.length === 0) return;

    const snapshot: EditorSnapshot = {
      tokens: [...this.tokens],
      cursorIndex: this.cursorIndex,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd
    };
    this.redoStack.push(snapshot);

    const prev = this.historyStack.pop();
    if (prev) this.restoreSnapshot(prev);
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const snapshot: EditorSnapshot = {
      tokens: [...this.tokens],
      cursorIndex: this.cursorIndex,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd
    };
    this.historyStack.push(snapshot);

    const next = this.redoStack.pop();
    if (next) this.restoreSnapshot(next);
  }

  private restoreSnapshot(s: EditorSnapshot) {
    this.tokens = s.tokens;
    this.cursorIndex = s.cursorIndex;
    this.selectionStart = s.selectionStart;
    this.selectionEnd = s.selectionEnd;
  }

  public getRawLatex(): string {
    let res = "";
    // ArkTS 的 map/join 没问题，但为了稳健可以用 forEach
    this.tokens.forEach(t => {
      res += t.value;
    });
    return res;
  }
}

// 导出单例
export const calculatorStore = new CalculatorStore();