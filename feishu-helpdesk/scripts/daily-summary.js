#!/usr/bin/env node
/**
 * 每日工单总结脚本（优化版 v2）
 * 
 * 定时任务：每天 22:00 执行
 * 数据来源：飞书多维表格（Bitable）
 * 智能分类：自动分析问题类别和标签
 * 
 * 输出格式：
 * output/summary-YYYY-MM-DD/
 *   ├── ticket-T20260302001.md
 *   └── daily-overview.md
 */

const fs = require('fs');
const path = require('path');
const { classifyTicket } = require('./classifier');

const OUTPUT_BASE = path.join(__dirname, '../output');
const CONFIG_PATH = path.join(__dirname, '../config/bitable-config.json');

/**
 * 配置信息
 */
function loadConfig() {
  try {
    return require(CONFIG_PATH);
  } catch (err) {
    console.warn('⚠️  未找到 bitable-config.json，使用默认配置');
    return {
      bitableAppToken: '',
      bitableTableId: '',
      dateField: '工单日期',
      statusField: '状态',
      closedStatus: '已结束'
    };
  }
}

/**
 * 从飞书多维表格读取工单数据
 * 
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @returns {Promise<Array>} 工单列表
 */
async function getTicketsFromBitable(date) {
  const config = loadConfig();
  
  console.log(`📊 从多维表格读取工单数据`);
  console.log(`   日期：${date}`);
  console.log(`   AppToken: ${config.bitableAppToken || '未配置'}`);
  console.log(`   数据表：${config.bitableTableId || '未配置'}`);
  
  // 阶段一：返回空数组（待配置后接入 Bitable API）
  // 阶段二：调用飞书 Bitable API 获取实际数据
  return [];
}

/**
 * 生成工单总结文档（优化模板）
 * 
 * @param {object} ticket - 工单数据
 * @returns {string} Markdown 内容
 */
function generateTicketSummary(ticket) {
  const {
    ticketId,
    date,
    requester,
    assignee,
    problemDesc,
    rootCause,
    solution,
    category: manualCategory,
    tags: manualTags
  } = ticket;

  // 智能分类（如果工单数据中没有提供）
  let category = manualCategory;
  let tags = manualTags;
  
  if (!category || !tags) {
    const classification = classifyTicket(ticket);
    category = category || classification.category;
    tags = tags || classification.tags;
  }
  
  // 标签格式化
  const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '无');

  return `# 工单总结：${ticketId || '未命名'}

## 基本信息

- 工单提出日期：${date || '未记录'}
- 工单提出人：${requester || '未记录'}
- 工单对接人：${assignee || '未记录'}

## 问题描述

${problemDesc || '暂无描述'}

## 问题根因

${rootCause || '暂无分析'}

## 解决方案

${solution || '暂无方案'}

## 问题类别

${category || '未分类'}

## 问题标签

${tagsStr}

---
*本总结由 OpenClaw 自动生成 | 生成时间：${new Date().toLocaleString('zh-CN')}*
`;
}

/**
 * 生成每日总览文档
 */
function generateDailyOverview(date, tickets) {
  const closedCount = tickets.filter(t => t.status === '已结束').length;
  
  // 按类别统计
  const categoryStats = {};
  tickets.forEach(t => {
    const cat = t.category || '未分类';
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });
  
  const categoryList = Object.entries(categoryStats)
    .map(([cat, count]) => `- ${cat}: ${count} 个`)
    .join('\n');
  
  // 按标签统计
  const tagStats = {};
  tickets.forEach(t => {
    const ticketTags = Array.isArray(t.tags) ? t.tags : [];
    ticketTags.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
  });
  
  const tagList = Object.entries(tagStats)
    .map(([tag, count]) => `- ${tag}: ${count} 个`)
    .join('\n');

  // 工单列表
  const ticketList = tickets.map(t => 
    `- [${t.ticketId || '未命名'}] ${t.category || '未分类'} - ${t.requester || '未知'}`
  ).join('\n');

  return `# 工单日报 - ${date}

## 📊 概览

| 指标 | 数值 |
|------|------|
| 工单总数 | ${tickets.length} |
| 已结束 | ${closedCount} |

## 📋 按类别统计

${categoryList || '暂无数据'}

## 🏷️ 按标签统计

${tagList || '暂无数据'}

## 📝 工单列表

${ticketList || '今日无工单'}

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
  
  // 从多维表格获取工单
  const tickets = await getTicketsFromBitable(today);
  console.log(`📋 获取工单：${tickets.length} 个`);
  
  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 为每个工单生成总结
  const generatedFiles = [];
  for (const ticket of tickets) {
    // 智能分类
    const classification = classifyTicket(ticket);
    ticket.category = ticket.category || classification.category;
    ticket.tags = ticket.tags || classification.tags;
    
    const fileName = `ticket-${ticket.ticketId || 'unknown'}.md`;
    const filePath = path.join(outputDir, fileName);
    const content = generateTicketSummary(ticket);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    generatedFiles.push(fileName);
    console.log(`  ✅ ${fileName} (类别：${ticket.category})`);
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
    status: '阶段一：本地输出（需配置多维表格 AppToken）'
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
