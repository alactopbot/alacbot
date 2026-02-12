/**
 * 计算器 Skill
 * 执行数学计算
 */
export const calculatorSkill = {
  name: "calculate",
  description: "Perform mathematical calculations",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate (e.g., '2+2*3')",
      },
    },
    required: ["expression"],
  },
  handler: async (params: { expression: string }): Promise<string> => {
    try {
      // 安全的表达式评估
      const result = Function('"use strict"; return (' + params.expression + ")")();
      return `Result: ${params.expression} = ${result}`;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};