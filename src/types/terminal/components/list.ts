export interface TerminalListStateItem {
  text: string;
  children?: TerminalListStateItem[];
}

export interface TerminalListState {
  items: TerminalListStateItem[];
}
