import { matchesKey, Key } from "@mariozechner/pi-tui";

// 在组件中处理键盘输入
class MyComponent implements Component {
  handleInput(data: string) {
    if (matchesKey(data, Key.ctrl("c"))) {
      console.log("Ctrl+C pressed");
    }
    if (matchesKey(data, Key.char("w"))) {
      console.log("W pressed");
    }
    if (matchesKey(data, Key.key("escape"))) {
      console.log("Escape pressed");
    }
  }

  render(width: number): string[] {
    return ["Press Ctrl+C to exit"];
  }

  invalidate() {}
}