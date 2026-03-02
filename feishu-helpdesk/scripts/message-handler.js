#!/usr/bin/env node
/**
 * 消息处理器 - 监听并处理群聊消息
 * 
 * 触发条件：
 * - 用户@机器人
 * - 消息包含"搜索："或"工单："前缀
 * 
 * 处理流程：
 * 1. 提取问题内容
 * 2. 搜索知识库
 * 3. 汇总答案
 * 4. 回复用户
 */

const { searchKnowledge } = require('./search-knowledge');

// 消息触发模式
const TRIGGER_PATTERNS = [
  /^搜索 [:：]\s*(.+)$/i,      // "搜索：xxx" 或 "搜索：xxx"
  /^工单 [:：]?\s*(.+)$/i,      // "工单：xxx" 或 "工单 xxx"
  /^(.+?)\s*$/                 // 直接问题（无触发词）
];

/**
 * 解析消息，提取意图和内容
 * @param {string} message - 原始消息
 * @param {object} context - 消息上下文（发送者、群聊等）
 * @returns {object|null} - 解析结果或 null（不处理）
 */
function parseMessage(message, context = {}) {
  if (!message || typeof message !== 'string') {
    return null;
  }
  
  const trimmed = message.trim();
  
  // 检查是否被@（在飞书中，@信息通常在消息元数据中）
  const isMentioned = context.isMentioned || 
                      trimmed.includes('@') || 
                      context.mentions?.length > 0;
  
  // 如果没有被@且没有触发词，不处理
  if (!isMentioned && !trimmed.match(/^(搜索 | 工单)/i)) {
    return null;
  }
  
  // 尝试匹配各种模式
  for (const pattern of TRIGGER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const [, content] = match;
      if (content && content.trim()) {
        return {
          type: pattern.source.includes('搜索') ? 'search' : 
                pattern.source.includes('工单') ? 'ticket' : 'question',
          content: content.trim(),
          originalMessage: trimmed,
          sender: context.sender,
          chatId: context.chatId,
          timestamp: new Date().toISOString()
        };
      }
    }
  }
  
  return null;
}

/**
 * 处理消息，生成回复
 * @param {string} message - 原始消息
 * @param {object} context - 消息上下文
 * @returns {Promise<object>} - 处理结果
 */
async function handleMessage(message, context = {}) {
  const parsed = parseMessage(message, context);
  
  if (!parsed) {
    return {
      handled: false,
      reason: '消息不匹配触发条件'
    };
  }
  
  // 清理问题内容（移除@和触发词）
  let cleanQuestion = parsed.content
    .replace(/@[\w\u4e00-\u9fa5]+\s*/g, '')  // 移除@提及
    .replace(/^搜索 [:：]\s*/i, '')            // 移除"搜索："
    .replace(/^工单 [:：]?\s*/i, '')           // 移除"工单："
    .trim();
  
  console.log(`📨 处理消息 [${parsed.type}]: ${cleanQuestion}`);
  
  // 搜索知识库
  const searchResult = await searchKnowledge(cleanQuestion);
  
  // 构建回复
  const config = require('../config/knowledge-base.json');
  let reply = buildReply(parsed, searchResult, config);
  
  return {
    handled: true,
    parsed,
    searchResult,
    reply,
    timestamp: new Date().toISOString()
  };
}

/**
 * 构建回复消息
 * @param {object} parsed - 解析后的消息
 * @param {object} searchResult - 搜索结果
 * @param {object} config - 配置
 * @returns {string} - 回复内容
 */
function buildReply(parsed, searchResult, config) {
  const { answerTemplate } = config;
  
  let reply = answerTemplate?.prefix || "🔍 根据知识库搜索，找到以下相关信息：\n\n";
  
  if (searchResult.results && searchResult.results.length > 0) {
    for (const item of searchResult.results) {
      reply += `📌 **${item.title}**\n`;
      reply += `${item.snippet || '暂无摘要'}\n\n`;
    }
  } else {
    reply += "😅 暂未找到相关信息，请尝试：\n";
    reply += "• 使用更具体的关键词\n";
    reply += "• 联系人工支持\n\n";
  }
  
  reply += answerTemplate?.suffix || "💡 如果以上信息未能解决您的问题，请补充更多细节或联系人工支持。";
  
  // 添加引用信息（如果是工单）
  if (parsed.type === 'ticket') {
    reply += `\n\n📋 工单参考：${parsed.content}`;
  }
  
  return reply;
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法：node message-handler.js "消息内容" [--mention]');
    console.log('示例：node message-handler.js "搜索：如何重置密码" --mention');
    process.exit(0);
  }
  
  const message = args[0];
  const isMentioned = args.includes('--mention');
  
  handleMessage(message, { isMentioned })
    .then(result => {
      console.log('\n=== 处理结果 ===\n');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.handled) {
        console.log('\n=== 回复内容 ===\n');
        console.log(result.reply);
      }
    })
    .catch(err => {
      console.error('处理失败:', err);
      process.exit(1);
    });
}

module.exports = { handleMessage, parseMessage, buildReply };
