#!/usr/bin/env node
/**
 * 工单聊天记录解析器
 * 
 * 从飞书多维表格的聊天记录 JSON 中提取关键信息：
 * - 问题描述
 * - 问题根因
 * - 解决方案
 * - 提出人、对接人
 * - 日期等
 */

const { classifyTicket } = require('./classifier');

/**
 * 解析工单聊天记录
 * @param {object} ticketData - 原始工单数据
 * @returns {object} 解析后的工单信息
 */
function parseTicket(ticketData) {
  const { name, ticket_id, msg = [] } = ticketData;
  
  // 1. 提取基本信息
  const ticketId = ticket_id?.toString() || 'unknown';
  
  // 2. 从聊天记录中提取人员信息
  const participants = {};
  msg.forEach(m => {
    const userName = m.user_name;
    if (userName) {
      participants[userName] = (participants[userName] || 0) + 1;
    }
  });
  
  // 第一条消息的发送者通常是提出人
  const requester = msg[0]?.user_name || '未知';
  
  // 回复消息的人是处理人（排除提出人）
  const assignee = msg.find(m => m.user_name !== requester)?.user_name || '未知';
  
  // 3. 提取日期（从第一条消息）
  const date = msg[0]?.date?.split(' ')[0] || new Date().toISOString().split('T')[0];
  
  // 4. 提取问题描述（从 name 字段 + 早期消息）
  const problemDesc = extractProblemDescription(name, msg);
  
  // 5. 提取问题根因和解决方案（从后期消息中找结论）
  const { rootCause, solution } = extractCauseAndSolution(msg);
  
  // 6. 智能分类
  const classification = classifyTicket({ problemDesc, rootCause });
  
  return {
    ticketId,
    date,
    requester,
    assignee,
    problemDesc,
    rootCause,
    solution,
    category: classification.category,
    tags: classification.tags,
    status: '已结束',
    // 保留原始数据
    raw: ticketData
  };
}

/**
 * 提取问题描述
 * @param {string} name - 工单名称
 * @param {Array} msg - 消息列表
 * @returns {string} 问题描述
 */
function extractProblemDescription(name, msg) {
  // 优先使用 name 字段（通常包含完整问题描述）
  if (name && name.trim()) {
    return name.trim();
  }
  
  // 从早期消息中提取（前 5 条）
  const earlyMessages = msg.slice(0, 5)
    .filter(m => m.content && !m.content.includes('<img'))
    .map(m => m.content)
    .join('；');
  
  return earlyMessages || '暂无描述';
}

/**
 * 从聊天记录中提取问题根因和解决方案
 * @param {Array} msg - 消息列表
 * @returns {object} { rootCause, solution }
 */
function extractCauseAndSolution(msg) {
  // 从后期消息中找结论性内容（最后 5 条）
  const lateMessages = msg.slice(-5);
  
  let rootCause = '';
  let solution = '';
  
  // 关键词识别
  const causeKeywords = ['问题', '原因', '导致', '因为', '查到', '发现', '是'];
  const solutionKeywords = ['解决', '处理', '建议', '设置', '配置', '好了', '没事'];
  
  for (const m of lateMessages) {
    const content = m.content || '';
    
    // 跳过图片消息
    if (content.includes('<img')) continue;
    
    // 检查是否包含结论性内容
    const isConclusion = causeKeywords.some(k => content.includes(k)) ||
                         solutionKeywords.some(k => content.includes(k));
    
    if (isConclusion) {
      // 判断是根因还是解决方案
      if (content.includes('查到') || content.includes('问题') || 
          content.includes('原因') || content.includes('导致')) {
        rootCause = content;
      } else if (content.includes('解决') || content.includes('设置') ||
                 content.includes('配置') || content.includes('好了')) {
        solution = content;
      }
    }
  }
  
  // 如果没有明确的根因，取最后一条有意义的消息
  if (!rootCause) {
    const lastMeaningfulMsg = lateMessages.reverse().find(
      m => m.content && !m.content.includes('<img') && m.content.length > 10
    );
    if (lastMeaningfulMsg) {
      rootCause = lastMeaningfulMsg.content;
    }
  }
  
  return {
    rootCause: rootCause || '暂无分析',
    solution: solution || '已解决'
  };
}

/**
 * 批量解析工单
 * @param {Array} tickets - 工单列表
 * @returns {Array} 解析后的工单列表
 */
function parseTickets(tickets) {
  return tickets.map(parseTicket);
}

// CLI 测试入口
if (require.main === module) {
  // 测试数据
  const testData = {
    name: "滴滴金融 ID：93924；每天外呼结束后，总是会有 8.9 个少量数据打不完要等到第二天重呼。单任务外呼数据量级很大，按理说不会出现个别任务打不完的情况，请帮忙查一下是什么问题。实例任务：滴滴 - 新客 1-B 组 - 有变量 - 小程序 -080703；任务 ID：6832874；",
    ticket_id: 7400576031599525892,
    msg: [
      { user_name: "招财", date: "2024-08-08 09:55:37", content: "<img ...>" },
      { user_name: "招财", date: "2024-08-08 09:34:41", content: "AICC" },
      { user_name: "招财", date: "2024-08-08 09:34:46", content: "AI 外呼外呼相关" },
      { user_name: "招财", date: "2024-08-08 09:35:05", content: "外呼过程中自动暂停，等待一段时间才能重启" },
      { user_name: "招财", date: "2024-08-08 09:40:07", content: "转人工" },
      { user_name: "招财", date: "2024-08-08 09:43:59", content: "halo？" },
      { user_name: "算盘", date: "2024-08-08 09:53:58", content: "单个任务打不完？" },
      { user_name: "算盘", date: "2024-08-08 09:55:26", content: "没太懂你想描述什么内容。" },
      { user_name: "招财", date: "2024-08-08 09:55:56", content: "这个是昨天的任务，显示有 8 条没打完" },
      { user_name: "招财", date: "2024-08-08 09:56:31", content: "我们都是等数据统一进完统一开启外呼的；按理说不应该就剩 8 条外呼任务没打完要等重播" },
      { user_name: "招财", date: "2024-08-08 09:59:30", content: "能帮忙查一下昨天这几个话单么？为啥没打完：6640327f1b79e719054521a6be6ad689" },
      { user_name: "算盘", date: "2024-08-19 19:03:13", content: "@招财 这个是设置重播了吧。重播的时间不在可拨打范围内" },
      { user_name: "招财", date: "2024-08-19 19:04:12", content: "没事了，查到问题了，客户下午 4、5 点偷偷往任务里传数据" },
      { user_name: "招财", date: "2024-08-19 19:04:20", content: "所以总是提示打完了" }
    ]
  };
  
  console.log('🧪 工单解析器测试\n');
  console.log('输入数据:', JSON.stringify(testData, null, 2).substring(0, 500) + '...\n');
  
  const result = parseTicket(testData);
  
  console.log('=== 解析结果 ===\n');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== 生成的总结文档 ===\n');
  const { generateTicketSummary } = require('./daily-summary');
  console.log(generateTicketSummary(result));
}

module.exports = {
  parseTicket,
  parseTickets,
  extractProblemDescription,
  extractCauseAndSolution
};
