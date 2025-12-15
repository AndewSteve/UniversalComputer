import { FormulaToken } from '../../model/FormulaToken';

// 定义快照接口
export interface EditorSnapshot {
  tokens: FormulaToken[];
  cursorIndex: number;
  selectionStart: number;
  selectionEnd: number;
}

const MAX_HISTORY = 50;

export class HistoryLogic {
  // 撤销栈 (存过去的状态)
  private historyStack: EditorSnapshot[] = [];
  // 重做栈 (存未来的状态 - 只有在 Undo 后才会有内容)
  private redoStack: EditorSnapshot[] = [];

  /**
   * 保存当前状态到历史记录
   * @param currentState 当前编辑器状态
   */
  public pushSnapshot(currentState: EditorSnapshot) {
    // 1. 必须存入副本，而不是引用
    const snapshotCopy = this.cloneSnapshot(currentState);

    this.historyStack.push(snapshotCopy);

    // 2. 限制栈大小
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift(); // 移除最早的记录
    }

    // 3. 【关键逻辑】一旦产生新的操作，时间线分叉，“未来”失效
    this.redoStack = [];
  }

  /**
   * 执行撤销
   * @param currentState 当前状态 (需要被保存到 Redo 栈，以便“反悔”)
   * @returns 上一个状态 (如果无法撤销则返回 null)
   */
  public undo(currentState: EditorSnapshot): EditorSnapshot | null {
    if (this.historyStack.length === 0) {
      return null;
    }

    // 1. 把“现在”存入 Redo 栈，变成“未来”
    this.redoStack.push(this.cloneSnapshot(currentState));

    // 2. 从 History 栈取出“过去”，变成“现在”
    const prevState = this.historyStack.pop();

    return prevState || null;
  }

  /**
   * 执行重做
   * @param currentState 当前状态 (需要被保存回 History 栈)
   * @returns 下一个状态 (如果无法重做则返回 null)
   */
  public redo(currentState: EditorSnapshot): EditorSnapshot | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // 1. 把“现在”存入 History 栈，变成“过去”
    this.historyStack.push(this.cloneSnapshot(currentState));

    // 2. 从 Redo 栈取出“未来”，变成“现在”
    const nextState = this.redoStack.pop();

    return nextState || null;
  }

  /**
   * 辅助：克隆快照
   * 防止引用传递导致历史记录被意外修改
   */
  private cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
    return {
      // 数组浅拷贝：[...arr] 创建新数组，但元素仍是引用。
      // 对于 FormulaToken 这种类，如果不修改其内部属性(如 value)而只是替换对象，
      // 这种拷贝是安全的且性能较好。
      // 如果你的业务逻辑会直接修改 token.value，则需要 tokens.map(t => t.clone())
      tokens: [...snapshot.tokens],
      cursorIndex: snapshot.cursorIndex,
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd
    };
  }

  /**
   * 获取当前能否 Undo/Redo (用于控制 UI 按钮的置灰/高亮)
   */
  public canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}