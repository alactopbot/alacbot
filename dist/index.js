import readline from "node:readline";
class CalculatorApp {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "[calc] ",
        });
    }
    start() {
        console.log("🧮 Simple Calculator ready. Type expressions such as `2 + 2` or `exit` to quit.");
        this.promptLoop();
    }
    promptLoop() {
        this.rl.question("[calc] ", (input) => {
            const trimmed = input.trim();
            if (trimmed === "") {
                this.promptLoop();
                return;
            }
            if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "q") {
                console.log("👋 Calculator shutting down.");
                this.rl.close();
                return;
            }
            try {
                const result = this.evaluateExpression(trimmed);
                console.log(`= ${result}`);
            }
            catch (err) {
                console.log(`⚠️  ${err.message}`);
            }
            this.promptLoop();
        });
    }
    evaluateExpression(expression) {
        if (!/^[\d+\-*/().\s]+$/.test(expression)) {
            throw new Error("Only basic arithmetic expressions are supported.");
        }
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function(`"use strict"; return (${expression})`);
        const value = fn();
        if (typeof value !== "number" || Number.isNaN(value)) {
            throw new Error("Invalid expression");
        }
        return value;
    }
}
export default {
    registerSlashCommand: {
        name: "calc",
        description: "Run a small calculator session inside the terminal",
        handler: async () => {
            const calc = new CalculatorApp();
            calc.start();
        },
    },
};
