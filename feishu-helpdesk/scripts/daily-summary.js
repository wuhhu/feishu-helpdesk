#!/usr/bin/env node
/**
 * 每日工单总结脚本
 * 
 * 定时任务：每天 22:00 执行
 * 功能：
 * 1. 获取当天的工单列表
 * 2. 为每个工单生成独立总结文档
 * 3. 输出到 output/ 目录
 * 
 * 输出格式：
 * - output/summary-YYYY-MM-DD/           # 按日期分组
 *   - ticket-T20260302001.md             # 工单 1 总结
 *   - ticket-T20260302002.md             # 工单 2 总结
 *   - daily-overview.md                  # 每日总览
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_BASE = path.join(__dirname, '../output');

/**
 * 模拟工单数据（阶段一）
 * TODO: 阶段二接入飞书工单 API
 */
function getTodayTickets() {
  // 阶段一：返回空数组（实际数据需要从飞书 API 获取）
  // 这里提供示例数据结构
  return [
    // {
    //   ticketId: 'T20260302001',
    //   title: '无法登录系统',
    //   status: 'closed',
    //   createTime: '2026-03-02T09:15:00+08:00',
    //   closeTime: '2026-03-02T10:30:00+08:00',
    //   requester: '张三',
    //   assignee: '李四',
    //   chatMessages: [...],  // 聊天记录
    //   solution: '重置密码后解决'
    // }
  ];
}

/**
 * 为单个工单生成总结文档
 */
function generateTicketSummary(ticket) {
  const {
    ticketId,
    title,
    status,
    createTime,
    closeTime,
    requester,
    assignee,
    chatMessages = [],
    solution
  } = ticket;

  // 计算处理时长
  const duration = closeTime && createTime
    ? Math.round((new Date(closeTime) - new Date(createTime)) / 60000) // 分钟
    : null;

  // 统计消息数量
  const messageCount = chatMessages.length;

  // 提取关键对话（阶段一简化处理）
  const keyExchanges = chatMessages.slice(0, 5).map(msg => 
    `**${msg.sender}** (${new Date(msg.timestamp).toLocaleTimeString('zh-CN')}): ${msg.content}`
  ).join('\n\n');

  return `# 工单总结：${title}

## 📋 基本信息

| 字段 | 值 |
|------|-----|
| 工单号 | ${ticketId} |
| 状态 | ${status} |
| 申请人 | ${requester} |
| 处理人 | ${assignee} |
| 创建时间 | ${new Date(createTime).toLocaleString('zh-CN')} |
| 关闭时间 | ${closeTime ? new Date(closeTime).toLocaleString('zh-CN') : '未关闭'} |
| 处理时长 | ${duration ? `${duration} 分钟` : '未关闭'} |

## 💬 对话摘要

**总消息数：** ${messageCount} 条

${keyExchanges || '（暂无对话记录）'}

## ✅ 解决方案

${solution || '（暂无解决方案记录）'}

## 📊 分类标签

- 问题类型：待分类
- 紧急程度：待评估
- 涉及系统：待标记

---
*本总结由 OpenClaw 自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}*
`;
}

/**
 * 生成每日总览文档
 */
function generateDailyOverview(date, tickets) {
  const closedCount = tickets.filter(t => t.status === 'closed').length;
  const pendingCount = tickets.filter(t => t.status !== 'closed').length;

  const ticketList = tickets.map(t => 
    `- [${t.ticketId}] ${t.title} (${t.status}) - ${t.requester}`
  ).join('\n');

  return `# 工单日报 - ${date}

## 📊 概览

| 指标 | 数值 |
|------|------|
| 工单总数 | ${tickets.length} |
| 已关闭 | ${closedCount} |
| 待处理 | ${pendingCount} |
| 关闭率 | ${tickets.length > 0 ? Math.round(closedCount / tickets.length * 100) : 0}% |

## 📝 工单列表

${ticketList || '（今日无工单）'}

## 🔍 常见问题

（待实现：自动分析高频问题）

## 📈 处理时效

（待实现：统计平均处理时长）

---
*本日报由 OpenClaw 自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}*
`;
}

/**
 * 主函数：执行每日总结
 */
async function generateDailySummary(options = {}) {
  const today = new Date().toISOString().split('T')[0];
  const outputDir = path.join(OUTPUT_BASE, `summary-${today}`);
  
  console.log(`📅 生成每日总结：${today}`);
  console.log(`📂 输出目录：${outputDir}`);
  
  // 获取今日工单
  const tickets = getTodayTickets();
  console.log(`📋 发现工单：${tickets.length} 个`);
  
  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 为每个工单生成总结
  const generatedFiles = [];
  for (const ticket of tickets) {
    const fileName = `ticket-${ticket.ticketId}.md`;
    const filePath = path.join(outputDir, fileName);
    const content = generateTicketSummary(ticket);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    generatedFiles.push(fileName);
    console.log(`  ✅ ${fileName}`);
  }
  
  // 生成每日总览
  const overviewFile = 'daily-overview.md';
  const overviewPath = path.join(outputDir, overviewFile);
  const overviewContent = generateDailyOverview(today, tickets);
  fs.writeFileSync(overviewPath, overviewContent, 'utf-8');
  generatedFiles.push(overviewFile);
  console.log(`  ✅ ${overviewFile}`);
  
  // 如果无工单，生成空报告
  if (tickets.length === 0) {
    const emptyReport = `# 工单日报 - ${today}

## 📊 概览

今日无已结束工单。

---
*本日报由 OpenClaw 自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}*
`;
    fs.writeFileSync(overviewPath, emptyReport, 'utf-8');
  }
  
  console.log(`✅ 总结完成，生成 ${generatedFiles.length} 个文件`);
  
  return {
    date: today,
    outputDir,
    ticketCount: tickets.length,
    generatedFiles,
    status: '阶段一：本地输出（阶段二可上传知识库）'
  };
}

// CLI 入口
if (require.main === module) {
  generateDailySummary()
    .then(result => {
      console.log('\n=== 总结结果 ===\n');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n=== 输出位置 ===\n');
      console.log(result.outputDir);
    })
    .catch(err => {
      console.error('生成总结失败:', err);
      process.exit(1);
    });
}

module.exports = { generateDailySummary, generateTicketSummary, generateDailyOverview };
