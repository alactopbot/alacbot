import {
  TUI,
  Text,
  Input,
  Editor,
  Container,
  ProcessTerminal,
  CURSOR_MARKER,
} from "@mariozechner/pi-tui";
import { matchesKey, Key } from "@mariozechner/pi-tui";

class CalculatorApp {
  private tui: TUI;
  private display: string = "0";
  private operation: string = "";
  private previousValue: number = 0;
  private terminal: ProcessTerminal;

  constructor() {
    this.terminal = new ProcessTerminal();
    this.tui = new TUI(this.terminal);
  }

  start() {
    // 显示界面
    this.render();
    this.tui.start();
  }

  private render() {
    this.tui.removeAllChildren();

    this.tui.addChild(new Text("=== Calculator ==="));
    this.tui.addChild(new Text(`Display: ${this.display}`));
    this.tui.addChild(new Text(""));
    this.tui.addChild(new Text("Commands:"));
    this.tui.addChild(new Text("  [1-9] - Number"));
    this.tui.addChild(new Text("  [+/-/*] - Operation"));
    this.tui.addChild(new Text("  [=] - Calculate"));
    this.tui.addChild(new Text("  [C] - Clear"));
    this.tui.addChild(new Text("  [Q] - Quit"));

    const input = new Input();
    input.onSubmit = (value: string) => {
      this.processInput(value);
      this.render();
    };
    this.tui.addChild(input);
  }

  private processInput(input: string) {
    const key = input.trim().toUpperCase();

    if (/[0-9]/.test(key)) {
      this.display = this.display === "0" ? key : this.display + key;
    } else if (["+", "-", "*", "/"].includes(key)) {
      this.previousValue = Number(this.display);
      this.operation = key;
      this.display = "0";
    } else if (key === "=") {
      if (this.operation && this.previousValue !== undefined) {
        const current = Number(this.display);
        let result = 0;
        switch (this.operation) {
          case "+":
            result = this.previousValue + current;
            break;
          case "-":
            result = this.previousValue - current;
            break;
          case "*":
            result = this.previousValue * current;
            break;
          case "/":
            result = this.previousValue / current;
            break;
        }
        this.display = String(result);
        this.operation = "";
      }
    } else if (key === "C") {
      this.display = "0";
      this.operation = "";
      this.previousValue = 0;
    }
  }
}

export default {
  registerSlashCommand: {
    name: "calc",
    description: "Simple calculator",
    handler: async () => {
      const calc = new CalculatorApp();
      calc.start();
    },
  },
};