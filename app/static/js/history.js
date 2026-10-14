export class History {
  constructor(onChange, limit = 50) {
    this.stack = []; this.index = -1; this.limit = limit; this.onChange = onChange;
  }
  push(state) {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(structuredClone(state));
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
    this.onChange?.(this.current(), this.canUndo(), this.canRedo());
  }
  undo() { if (this.canUndo()) { this.index--; this._emit(); } }
  redo() { if (this.canRedo()) { this.index++; this._emit(); } }
  _emit() { this.onChange?.(this.current(), this.canUndo(), this.canRedo()); }
  current() { return this.stack[this.index]; }
  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }
}