#!/usr/bin/env node
/**
 * 消息处理器（优化版）
 * 
 * 功能：监听群聊消息，回复用户问题
 * 触发：用户@机器人
 * 逻辑：搜索知识库 → 汇总回复
 * 
 * 不读取工单信息，只根据知识库内容回复
 */

const { searchKnowledge } = require('./search-knowledge');

/**
 * 解析消息，提取问题内容
 * @param {string} message - 原始消息
 * @param {object} context - 消息上下文
 * @returns {string|null} 问题内容
 */
function extractQuestion(message, context = {}) {
  if (!message || typeof message !== 'string') {
    return null;
  }
  
  let cleanMsg = message.trim();
  
  // 移除@提及
  cleanMsg = cleanMsg.replace(/@[\w\u4e00-\u9fa5]+\s*/g, '').trim();
  
  // 移除常见触发词
  const prefixes = [
    /^搜索 [:：]\s*/i,
    /^问题 [:：]\s*/i,
    /^问 [:：]\s*/i,
    /^helpdesk [:：]?\s*/i
  ];
  
  for (const prefix of prefixes) {
    cleanMsg = cleanMsg.replace(prefix, '');
  }
  
  return cleanMsg.trim() || null;
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
  const triggers = ['搜索', 'helpdesk', 'help'];
  const lowerMsg = message.toLowerCase();
  
  for (const trigger of triggers) {
    if (lowerMsg.includes(trigger.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * 构建回复消息
 */
function buildReply(question, searchResult) {
  // 加载配置
  let config = {};
  try {
    config = require('../config/knowledge-base.json');
  } catch (err) {
    config = {};
  }
  
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
}

/**
 * 处理消息，生成回复
 * @param {string} message - 原始消息
 * @param {object} context - 消息上下文
 * @returns {Promise<object>} 处理结果
 */
async function handleMessage(message, context = {}) {
  // 检查是否应该处理
  if (!shouldProcess(message, context)) {
    return {
      handled: false,
      reason: '消息不满足处理条件'
    };
  }
  
  // 提取问题
  const question = extractQuestion(message, context);
  
  if (!question) {
    return {
      handled: false,
      reason: '无法提取问题内容'
    };
  }
  
  console.log(`📨 处理问题：${question}`);
  
  // 搜索知识库
  const searchResult = await searchKnowledge(question);
  
  // 构建回复
  const reply = buildReply(question, searchResult);
  
  return {
    handled: true,
    question,
    reply,
    searchResults: searchResult.results?.length || 0,
    timestamp: new Date().toISOString()
  };
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法：node message-handler.js "消息内容" [--mention]');
    console.log('示例：');
    console.log('  node message-handler.js "@机器人 如何重置密码" --mention');
    console.log('  node message-handler.js "搜索：报销流程"');
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

module.exports = { handleMessage, extractQuestion, shouldProcess, buildReply };
