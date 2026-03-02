#!/usr/bin/env node
/**
 * 工单聊天记录解析器（v2 - 售后分析专家模式）
 * 
 * 角色：专业售后分析专家
 * 功能：从聊天记录中提取关键信息，生成规范总结
 */

const { classifyTicket } = require('./classifier');

/**
 * 解析工单聊天记录
 * @param {object} ticketData - 原始工单数据
 * @returns {object} 解析后的工单信息
 */
function parseTicket(ticketData) {
  const { name, ticket_id, msg = [] } = ticketData;
  
  // 1. 提取工单号
  const ticketId = ticket_id?.toString() || 'unknown';
  
  // 2. 分析聊天记录，提取对话信息
  const conversation = analyzeConversation(msg);
  
  // 3. 提取基本信息
  const basicInfo = extractBasicInfo(msg, conversation);
  
  // 4. 提取问题描述
  const problemDesc = extractProblemDescription(name, msg, conversation);
  
  // 5. 提取问题根因
  const rootCause = extractRootCause(msg, conversation);
  
  // 6. 提取解决方案
  const solution = extractSolution(msg, conversation);
  
  // 7. 智能分类
  const classification = classifyTicket({ problemDesc, rootCause });
  
  // 8. 格式化日期 [yyyy-mm-dd]
  const formattedDate = formatDate(basicInfo.date);
  
  return {
    ticketId,
    date: formattedDate,
    requester: basicInfo.requester,
    assignee: basicInfo.assignee,
    problemDesc,
    rootCause,
    solution,
    category: classification.category,
    tags: classification.tags,
    status: '已结束',
    conversation,
    raw: ticketData
  };
}

/**
 * 分析聊天记录，提取对话信息
 * @param {Array} msg - 消息列表
 * @returns {Array} 结构化对话
 */
function analyzeConversation(msg) {
  const conversation = [];
  
  for (const m of msg) {
    const { user_name, content, date } = m;
    
    if (!user_name || !content) continue;
    
    // 处理不同类型的消息
    let processedContent = content;
    let note = '';
    
    // 图片消息
    if (content.includes('<img')) {
      note = '[图片消息]';
      processedContent = extractImageDescription(content);
    }
    
    // @消息
    if (content.includes('<at')) {
      processedContent = content.replace(/<at[^>]*>[^<]*<\/at>/g, '').trim();
    }
    
    // 跳过纯图片且无法解析的消息
    if (!processedContent && note) {
      conversation.push({
        user_name,
        date,
        content: note,
        type: 'image'
      });
      continue;
    }
    
    conversation.push({
      user_name,
      date,
      content: processedContent || content,
      type: note ? 'image' : 'text'
    });
  }
  
  return conversation;
}

/**
 * 提取图片描述（阶段一：返回占位符）
 * TODO: 阶段二接入图片识别 API
 */
function extractImageDescription(content) {
  // 尝试从 img 标签中提取 alt 或 title
  const altMatch = content.match(/alt=["']([^"']*)["']/i);
  if (altMatch && altMatch[1]) {
    return `[图片：${altMatch[1]}]`;
  }
  
  // 阶段一：返回通用描述
  return '[用户发送了图片，内容需人工审核]';
}

/**
 * 提取基本信息
 */
function extractBasicInfo(msg, conversation) {
  // 提出人：第一条消息的发送者
  const requester = conversation[0]?.user_name || msg[0]?.user_name || '未知';
  
  // 对接人：第一个回复的人（排除提出人）
  let assignee = '未知';
  for (const c of conversation) {
    if (c.user_name !== requester) {
      assignee = c.user_name;
      break;
    }
  }
  
  // 日期：第一条消息的日期
  const date = conversation[0]?.date || msg[0]?.date || new Date().toISOString().split('T')[0];
  
  return { requester, assignee, date };
}

/**
 * 提取问题描述
 */
function extractProblemDescription(name, msg, conversation) {
  // 优先使用 name 字段
  if (name && name.trim()) {
    return name.trim();
  }
  
  // 从早期消息中提取（前 5 条）
  const earlyMessages = conversation
    .slice(0, 5)
    .filter(c => c.type !== 'image' || c.content.includes('[图片：'))
    .map(c => `${c.user_name}(${formatDate(c.date, true)}): ${c.content}`)
    .join('\n');
  
  return earlyMessages || '暂无描述';
}

/**
 * 提取问题根因
 */
function extractRootCause(msg, conversation) {
  // 关键词识别（结论性内容）- 按优先级排序
  const highPriorityKeywords = [
    { k: '查到问题', w: 3 },
    { k: '问题了', w: 3 },
    { k: '查到', w: 2 },
    { k: '原因是', w: 2 },
    { k: '是因为', w: 2 },
    { k: '导致', w: 2 },
    { k: '客户', w: 1 },
    { k: '实际', w: 1 }
  ];
  
  // 从后期消息中找（最后 1/3）
  const startIndex = Math.floor(conversation.length * 2 / 3);
  const lateMessages = conversation.slice(startIndex);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const c of lateMessages) {
    const content = c.content || '';
    let score = 0;
    
    // 计算匹配分数
    for (const { k, w } of highPriorityKeywords) {
      if (content.includes(k)) {
        score += w;
      }
    }
    
    // 额外加分：总结性语句
    if (content.includes('没事了') || content.includes('所以')) {
      score += 2;
    }
    
    if (score > bestScore && content.length > 10) {
      bestScore = score;
      bestMatch = c;
    }
  }
  
  if (bestMatch) {
    return `${bestMatch.user_name}(${formatDate(bestMatch.date, true)}): ${bestMatch.content}`;
  }
  
  return '暂无分析';
}

/**
 * 提取解决方案
 */
function extractSolution(msg, conversation) {
  // 关键词识别 - 按优先级排序
  const solutionKeywords = [
    { k: '重播', w: 3 },
    { k: '重呼', w: 3 },
    { k: '设置', w: 2 },
    { k: '配置', w: 2 },
    { k: '建议', w: 2 },
    { k: '解决', w: 2 },
    { k: '处理', w: 2 },
    { k: '好了', w: 1 },
    { k: '没事', w: 1 }
  ];
  
  // 从后期消息中找
  const startIndex = Math.floor(conversation.length * 2 / 3);
  const lateMessages = conversation.slice(startIndex);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const c of lateMessages) {
    const content = c.content || '';
    let score = 0;
    
    // 计算匹配分数
    for (const { k, w } of solutionKeywords) {
      if (content.includes(k)) {
        score += w;
      }
    }
    
    if (score > bestScore && content.length > 5) {
      bestScore = score;
      bestMatch = c;
    }
  }
  
  if (bestMatch) {
    return `${bestMatch.user_name}(${formatDate(bestMatch.date, true)}): ${bestMatch.content}`;
  }
  
  return '已解决';
}

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @param {boolean} includeTime - 是否包含时间
 * @returns {string} 格式化后的日期 [yyyy-mm-dd] 或 [yyyy-mm-dd HH:MM]
 */
function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return '[unknown]';
  
  // 处理 "2024-08-08 09:55:37" 格式
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/);
  if (match) {
    if (includeTime && match[2]) {
      return `[${match[1]} ${match[2]}]`;
    }
    return `[${match[1]}]`;
  }
  
  // 处理 ISO 格式
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (includeTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `[${year}-${month}-${day} ${hours}:${minutes}]`;
    }
    
    return `[${year}-${month}-${day}]`;
  } catch (e) {
    return `[${dateStr}]`;
  }
}

/**
 * 生成总结文档
 * @param {object} ticket - 解析后的工单数据
 * @returns {string} Markdown 内容
 */
function generateSummary(ticket) {
  const {
    ticketId,
    date,
    requester,
    assignee,
    problemDesc,
    rootCause,
    solution,
    category,
    tags
  } = ticket;

  const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '无');

  return `# 工单总结：${ticketId}

## 基本信息

- 工单提出日期：${date}
- 工单提出人：${requester}
- 工单对接人：${assignee}

## 问题描述

${problemDesc}

## 问题根因

${rootCause}

## 解决方案

${solution}

## 问题类别

${category}

## 问题标签

${tagsStr}

---
*本总结由 OpenClaw 自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}*
`;
}

/**
 * 批量解析工单
 */
function parseTickets(tickets) {
  return tickets.map(parseTicket);
}

// CLI 测试入口
if (require.main === module) {
  const testData = {
    name: "滴滴金融 ID：93924；每天外呼结束后，总是会有 8.9 个少量数据打不完要等到第二天重呼。单任务外呼数据量级很大，按理说不会出现个别任务打不完的情况，请帮忙查一下是什么问题。实例任务：滴滴 - 新客 1-B 组 - 有变量 - 小程序 -080703；任务 ID：6832874；",
    ticket_id: 7400576031599525892,
    msg: [
      { user_name: "招财", date: "2024-08-08 09:55:37", content: "<img src=\"/open-apis/helpdesk/v1/ticket_images?helpdesk_id=7270338362178076675&ticket_id=7400576031599525892&msg_id=7400581430905995265\"/>" },
      { user_name: "招财", date: "2024-08-08 09:34:41", content: "AICC" },
      { user_name: "招财", date: "2024-08-08 09:34:46", content: "AI 外呼外呼相关" },
      { user_name: "招财", date: "2024-08-08 09:35:05", content: "外呼过程中自动暂停，等待一段时间才能重启" },
      { user_name: "招财", date: "2024-08-08 09:40:07", content: "转人工" },
      { user_name: "招财", date: "2024-08-08 09:43:59", content: "halo？" },
      { user_name: "算盘", date: "2024-08-08 09:53:58", content: "单个任务打不完？" },
      { user_name: "算盘", date: "2024-08-08 09:55:26", content: "没太懂你想描述什么内容。" },
      { user_name: "招财", date: "2024-08-08 09:55:56", content: "这个是昨天的任务，显示有 8 条没打完" },
      { user_name: "招财", date: "2024-08-08 09:56:31", content: "我们都是等数据统一进完统一开启外呼的；按理说不应该就剩 8 条外呼任务没打完要等重播" },
      { user_name: "招财", date: "2024-08-08 09:59:30", content: "能帮忙查一下昨天这几个话单么？为啥没打完：6640327f1b79e719054521a6be6ad689 344e0945391b9753181acad81b07020e 60e4e91be792dbaebd5a92ce6e384710" },
      { user_name: "算盘", date: "2024-08-19 19:03:13", content: "<at user_id=\"7278977548950978561\">@招财（朱贺）（招财）</at> 这个是设置重播了吧。重播的时间不在可拨打范围内" },
      { user_name: "招财", date: "2024-08-19 19:04:12", content: "没事了，查到问题了，客户下午 4、5 点偷偷往任务里传数据" },
      { user_name: "招财", date: "2024-08-19 19:04:20", content: "所以总是提示打完了" }
    ]
  };
  
  console.log('🧪 工单解析器测试（售后分析专家模式）\n');
  
  const result = parseTicket(testData);
  
  console.log('=== 解析结果 ===\n');
  console.log(generateSummary(result));
}

module.exports = {
  parseTicket,
  parseTickets,
  analyzeConversation,
  extractBasicInfo,
  extractProblemDescription,
  extractRootCause,
  extractSolution,
  formatDate,
  generateSummary
};
