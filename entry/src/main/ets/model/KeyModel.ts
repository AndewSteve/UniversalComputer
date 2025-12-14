import { AppColors } from '../common/values/AppColors';
import { TokenType } from './FormulaToken';


// ============================================================
// 2. 键位模型定义
// ============================================================
export enum KeyAction {
  INSERT,
  DELETE,
  CLEAR,
  NAV_LEFT,
  NAV_RIGHT,
  EXECUTE,
  SELECT_EXPAND
}

// 【新增】：模板单元接口
export interface TemplateItem {
  value: string;
  type: TokenType;
  // 如果为 true，表示插入后光标应该停在这个 Token 的后面
  // 如果所有 Item 都没有这个标记，默认停在最后
  isCursorStop?: boolean;
}

export interface KeyModel {
  label: string;
  value: string;
  action: KeyAction;

  // UI 样式配置
  bgColor?: string;
  textColor?: string;

  // 简单插入配置 (用于普通按键)
  insertType?: TokenType;
  insertColor?: string;

  // 【新增】：复杂插入配置 (用于 1/x, \sqrt 等)
  // 如果配置了这个，Factory 将忽略 insertType/insertColor，直接使用模板
  template?: TemplateItem[];

  variants?: KeyModel[];
}

