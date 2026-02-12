/**
 * 基础适配器接口
 * OpenClaw 用这个来连接不同平台
 */

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  platform: string;
}

export interface PlatformAdapter {
  name: string;
  /**
   * 注册消息处理器
   */
  setOnMessage(handler: (message: Message) => Promise<string>): void;

  // 处理来自平台的消息
  onMessage(message: Message): Promise<string>;
  
  // 发送消息回平台
  sendMessage(userId: string, content: string): Promise<void>;
  
  // 启动适配器
  start(): Promise<void>;
  
  // 停止适配器
  stop(): Promise<void>;
}
