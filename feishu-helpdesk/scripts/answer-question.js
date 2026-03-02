#!/usr/bin/env node
/**
 * 问题应答脚本
 * 
 * 监听群聊消息，当用户@机器人并提问时：
 * 1. 提取问题内容
 * 2. 搜索知识库
 * 3. 汇总答案并回复
 * 
 * 触发格式:
 *   @机器人 搜索：[问题]
 *   @机器人 [问题]
 */

const { searchKnowledge } = require('./search-knowledge');

async function answerQuestion(question, context = {}) {
  console.log(`❓ 收到问题：${question}`);
  
  // 1. 搜索知识库
  const searchResult = await searchKnowledge(question);
  
  // 2. 构建回复
  const config = require('../config/knowledge-base.json');
  let reply = config.answerTemplate?.prefix || "🔍 根据知识库搜索，找到以下相关信息：\n\n";
  
  for (const item of searchResult.results) {
    reply += `📌 **${item.title}**\n`;
    reply += `${item.snippet}\n\n`;
  }
  
  reply += config.answerTemplate?.suffix || "💡 如果以上信息未能解决您的问题，请补充更多细节或联系人工支持。";
  
  // 3. 返回回复内容
  return {
    question,
    reply,
    searchResults: searchResult.results,
    timestamp: new Date().toISOString()
  };
}

// CLI 入口
if (require.main === module) {
  const question = process.argv[2];
  if (!question) {
    console.error('用法：node answer-question.js "问题内容"');
    process.exit(1);
  }
  
  answerQuestion(question)
    .then(result => {
      console.log('\n=== 回复内容 ===\n');
      console.log(result.reply);
    })
    .catch(err => {
      console.error('应答失败:', err);
      process.exit(1);
    });
}

module.exports = { answerQuestion };
