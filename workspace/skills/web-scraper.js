/**
 * 网页爬取 Skill
 * 从URL获取文本内容
 */
export const webScraperSkill = {
    name: "fetch_url",
    description: "Fetch and summarize content from a URL",
    parameters: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "The URL to fetch",
            },
        },
        required: ["url"],
    },
    handler: async (params) => {
        try {
            const response = await fetch(params.url);
            const text = await response.text();
            // 简单的文本提取（去除HTML标签）
            const cleanText = text.replace(/<[^>]*>/g, "").substring(0, 1000);
            return `Content from ${params.url}:\n\n${cleanText}`;
        }
        catch (err) {
            return `Error fetching URL: ${err.message}`;
        }
    },
};
