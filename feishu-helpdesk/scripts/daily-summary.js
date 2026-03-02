#!/usr/bin/env node
/**
 * 每日总结脚本
 * 
 * 定时任务：每天 18:00 执行
 * 功能：
 * 1. 获取当天的工单聊天记录
 * 2. 汇总整理
 * 3. 输出到指定位置
 * 
 * 当前阶段一输出：
 * - 本地文件：output/daily-summary-YYYY-MM-DD.md
 * - 群消息（可选）
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../output');

async function generateDailySummary(options = {}) {
  const today = new Date().toISOString().split('T')[0];
  const outputFile = path.join(OUTPUT_DIR, `daily-summary-${today}.md`);
  
  console.log(`📅 生成每日总结：${today}`);
  
  // TODO: 实际实现需要：
  // 1. 调用 feishu API 获取聊天记录
  // 2. 筛选工单相关消息
  // 3. 汇总整理
  
  // 模拟总结内容
  const summary = `# 工单日报 - ${today}

## 📊 概览
- 今日工单总数：0（待实现）
- 已解决：0
- 待处理：0

## 📝 工单详情

（待实现：从飞书 API 获取实际数据）

## 🔍 常见问题
（待实现：自动分析高频问题）

---
*本总结由 OpenClaw 自动生成*
`;
  
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(outputFile, summary, 'utf-8');
  
  console.log(`✅ 总结已保存到：${outputFile}`);
  
  return {
    date: today,
    outputFile,
    content: summary
  };
}

// CLI 入口
if (require.main === module) {
  generateDailySummary()
    .then(result => {
      console.log('\n=== 总结内容预览 ===\n');
      console.log(result.content);
    })
    .catch(err => {
      console.error('生成总结失败:', err);
      process.exit(1);
    });
}

module.exports = { generateDailySummary };
