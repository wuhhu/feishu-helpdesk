#!/usr/bin/env node
/**
 * 飞书服务台机器人 - 主入口
 * 
 * 统一入口，根据命令执行不同功能
 * 
 * 用法:
 *   node main.js search "关键词"     - 搜索知识库
 *   node main.js answer "问题"       - 回答问题
 *   node main.js summary             - 生成每日总结
 *   node main.js status              - 查看状态
 */

const { searchKnowledge } = require('./search-knowledge');
const { answerQuestion } = require('./answer-question');
const { generateDailySummary } = require('./daily-summary');

const COMMANDS = {
  search: {
    desc: '搜索知识库',
    usage: 'node main.js search "关键词"',
    handler: async (args) => {
      const query = args[0];
      if (!query) throw new Error('请提供搜索关键词');
      return await searchKnowledge(query);
    }
  },
  answer: {
    desc: '回答问题',
    usage: 'node main.js answer "问题内容"',
    handler: async (args) => {
      const question = args[0];
      if (!question) throw new Error('请提供问题内容');
      return await answerQuestion(question);
    }
  },
  summary: {
    desc: '生成每日总结',
    usage: 'node main.js summary',
    handler: async () => {
      return await generateDailySummary();
    }
  },
  status: {
    desc: '查看状态',
    usage: 'node main.js status',
    handler: async () => {
      const fs = require('fs');
      const path = require('path');
      
      const outputDir = path.join(__dirname, '../output');
      const files = fs.existsSync(outputDir) 
        ? fs.readdirSync(outputDir).filter(f => f.endsWith('.md'))
        : [];
      
      return {
        status: 'running',
        outputFiles: files.length,
        lastSummary: files[files.length - 1] || 'none',
        timestamp: new Date().toISOString()
      };
    }
  },
  help: {
    desc: '显示帮助',
    usage: 'node main.js help',
    handler: async () => {
      console.log('\n🤖 飞书服务台机器人 - 命令列表\n');
      for (const [cmd, info] of Object.entries(COMMANDS)) {
        if (cmd === 'help') continue;
        console.log(`  ${cmd.padEnd(10)} ${info.desc}`);
        console.log(`           ${info.usage}\n`);
      }
      return null;
    }
  }
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);
  
  if (!command || command === 'help') {
    await COMMANDS.help.handler();
    return;
  }
  
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.error(`❌ 未知命令：${command}`);
    console.error('使用 "node main.js help" 查看可用命令');
    process.exit(1);
  }
  
  try {
    console.log(`⚙️ 执行命令：${command}`);
    const result = await cmd.handler(commandArgs);
    
    if (result) {
      console.log('\n📋 结果:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error(`❌ 执行失败：${err.message}`);
    console.error(`💡 ${cmd.usage}`);
    process.exit(1);
  }
}

main();
