import {
  TUI,
  Text,
  Editor,
  Input,
  SelectList,
  Container,
  Box,
  Markdown,
  Loader,
  ProcessTerminal,
} from "@mariozechner/pi-tui";

const terminal = new ProcessTerminal();
const tui = new TUI(terminal);

// 1. 文本显示
tui.addChild(new Text("Hello World"));

// 2. 输入框
const input = new Input();
input.onSubmit = (value) => console.log("Submitted:", value);
tui.addChild(input);

// 3. 编辑器
const editor = new Editor(tui, {});
editor.onSubmit = (content) => console.log("Content:", content);
tui.addChild(editor);

// 4. 选择列表
const selectList = new SelectList(
  [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
  ],
  {
    onSelect: (item) => console.log("Selected:", item.value),
  }
);
tui.addChild(selectList);

// 5. Markdown 渲染
tui.addChild(new Markdown("# Hello\n\nThis is **bold**"));

// 6. 加载动画
tui.addChild(new Loader("Loading..."));

// 7. 容器布局
const container = new Container();
container.addChild(new Text("Line 1"));
container.addChild(new Text("Line 2"));
tui.addChild(container);

tui.start();