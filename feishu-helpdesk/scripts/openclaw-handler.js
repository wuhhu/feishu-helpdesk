/**
 * OpenClaw 消息处理器
 * 
 * 这个文件设计为在 OpenClaw 主会话中直接调用
 * 当收到飞书消息时，OpenClaw 可以调用此模块处理
 * 
 * 使用方式（在 OpenClaw 中）：
 * const handler = require('./openclaw-handler');
 * await handler.processFeishuMessage(message, context);
 */

const path = require('path');

// 动态加载其他模块（兼容 OpenClaw 环境）
function loadModule(name) {
  try {
    return require(`./${name}`);
  } catch (err) {
    console.warn(`加载模块 ${name} 失败：${err.message}`);
    return null;
  }
}

/**
 * 处理飞书消息（OpenClaw 调用入口）
 * 
 * @param {string} message - 消息内容
 * @param {object} context - 消息上下文
 * @param {string} context.sender - 发送者
 * @param {string} context.chatId - 群聊 ID
 * @param {boolean} context.isMentioned - 是否被@
 * @param {string} context.channel - 渠道 (feishu/webchat 等)
 * @returns {Promise<object>} 处理结果
 */
async function processFeishuMessage(message, context = {}) {
  console.log(`[Feishu Handler] 收到消息：${message}`);
  console.log(`[Feishu Handler] 上下文：`, JSON.stringify(context, null, 2));
  
  // 检查是否应该处理这条消息
  if (!shouldProcess(message, context)) {
    return {
      handled: false,
      reason: '消息不满足处理条件',
      action: 'ignore'
    };
  }
  
  // 提取问题内容
  const question = extractQuestion(message, context);
  
  if (!question) {
    return {
      handled: false,
      reason: '无法提取问题内容',
      action: 'ignore'
    };
  }
  
  console.log(`[Feishu Handler] 提取问题：${question}`);
  
  // 搜索知识库
  const searchResult = await searchKnowledgeSafe(question);
  
  // 构建回复
  const reply = buildReplySafe(question, searchResult);
  
  return {
    handled: true,
    action: 'reply',
    reply,
    metadata: {
      question,
      searchResults: searchResult.results?.length || 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * 判断是否应该处理这条消息
 */
function shouldProcess(message, context) {
  // 空消息不处理
  if (!message || !message.trim()) {
    return false;
  }
  
  // 被@的消息优先处理
  if (context.isMentioned) {
    return true;
  }
  
  // 包含触发词的消息
  const triggers = ['搜索', '工单', 'helpdesk', 'help'];
  const lowerMsg = message.toLowerCase();
  
  for (const trigger of triggers) {
    if (lowerMsg.includes(trigger.toLowerCase())) {
      return true;
    }
  }
  
  // 飞书渠道的消息（可能是工单群）
  if (context.channel === 'feishu' && context.chatId) {
    return true;
  }
  
  return false;
}

/**
 * 从消息中提取问题内容
 */
function extractQuestion(message, context) {
  const trimmed = message.trim();
  
  // 移除@提及
  let cleanMsg = trimmed.replace(/@[\w\s]+/g, '').trim();
  
  // 移除常见触发词
  const prefixes = [
    /^搜索 [:：]\s*/i,
    /^工单 [:：]?\s*/i,
    /^helpdesk [:：]?\s*/i,
    /^问题 [:：]\s*/i,
    /^问 [:：]\s*/i
  ];
  
  for (const prefix of prefixes) {
    cleanMsg = cleanMsg.replace(prefix, '');
  }
  
  return cleanMsg.trim() || null;
}

/**
 * 安全搜索知识库（带错误处理）
 */
async function searchKnowledgeSafe(query) {
  try {
    const searchModule = loadModule('search-knowledge');
    if (searchModule && searchModule.searchKnowledge) {
      return await searchModule.searchKnowledge(query);
    }
  } catch (err) {
    console.error('[Feishu Handler] 搜索失败:', err.message);
  }
  
  // 降级：返回空结果
  return {
    query,
    results: [],
    error: '搜索模块不可用',
    timestamp: new Date().toISOString()
  };
}

/**
 * 安全构建回复（带错误处理）
 */
function buildReplySafe(question, searchResult) {
  try {
    const configPath = path.join(__dirname, '../config/knowledge-base.json');
    const config = require(configPath);
    const { answerTemplate } = config;
    
    let reply = answerTemplate?.prefix || "🔍 根据知识库搜索，找到以下相关信息：\n\n";
    
    if (searchResult.results && searchResult.results.length > 0) {
      for (const item of searchResult.results) {
        reply += `📌 **${item.title}**\n`;
        reply += `${item.snippet || '暂无摘要'}\n\n`;
      }
    } else {
      reply += "😅 暂未找到相关信息。\n\n";
      reply += "建议：\n";
      reply += "• 尝试使用更具体的关键词\n";
      reply += "• 检查问题描述是否清晰\n";
      reply += "• 联系人工支持获取帮助\n\n";
    }
    
    reply += answerTemplate?.suffix || "💡 如未解决问题，请补充更多细节或联系人工支持。";
    
    return reply;
  } catch (err) {
    console.error('[Feishu Handler] 构建回复失败:', err.message);
    
    // 降级回复
    return `🔍 收到您的问题："${question}"\n\n` +
           `⚠️ 暂时无法访问知识库，请稍后重试或联系管理员。\n\n` +
           `💡 建议直接联系人工支持获取帮助。`;
  }
}

/**
 * 日志记录
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };
  
  console.log(`[${level}] ${message}`, data);
  
  // 可以写入日志文件
  // const fs = require('fs');
  // const logPath = path.join(__dirname, '../logs/handler.log');
  // fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
}

// 导出
module.exports = {
  processFeishuMessage,
  shouldProcess,
  extractQuestion,
  searchKnowledgeSafe,
  buildReplySafe,
  log
};

// CLI 测试入口
if (require.main === module) {
  console.log('🧪 OpenClaw Handler 测试模式\n');
  
  const testCases = [
    { msg: '@机器人 搜索：如何重置密码', ctx: { isMentioned: true, channel: 'feishu' } },
    { msg: '工单 T20260302001', ctx: { channel: 'feishu' } },
    { msg: 'helpdesk 帮我查一下报销流程', ctx: { channel: 'feishu' } },
    { msg: '随便聊聊', ctx: { channel: 'webchat' } }
  ];
  
  testCases.forEach(async (test, i) => {
    console.log(`\n--- 测试 ${i + 1} ---`);
    console.log(`消息：${test.msg}`);
    
    const result = await processFeishuMessage(test.msg, test.ctx);
    console.log(`结果：${JSON.stringify(result, null, 2)}`);
    
    if (result.handled && result.reply) {
      console.log(`\n回复预览：${result.reply.substring(0, 100)}...`);
    }
  });
}
