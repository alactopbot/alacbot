import * as fs from "fs/promises";
import { SessionManager } from "./session-manager.js";

/**
 * 持久化会话
 * 保存对话历史到文件
 */
export class PersistentSessionManager extends SessionManager {
  private dataDir: string;

  constructor(userId: string, dataDir: string = "./data") {
    super(userId);
    this.dataDir = dataDir;
  }

  /**
   * 保存会话到文件
   */
  async save(): Promise<void> {
    const info = this.getInfo();
    const filePath = `${this.dataDir}/${info.sessionId}.json`;
    
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(info, null, 2));
    
    console.log(`Session saved to: ${filePath}`);
  }

  /**
   * 从文件加载会话
   */
  async load(sessionId: string): Promise<any> {
    const filePath = `${this.dataDir}/${sessionId}.json`;
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  }
}