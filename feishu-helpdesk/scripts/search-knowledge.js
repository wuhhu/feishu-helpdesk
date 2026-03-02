#!/usr/bin/env node
/**
 * 飞书知识库搜索脚本
 * 
 * 使用方法:
 *   node search-knowledge.js "搜索关键词"
 * 
 * 输出: JSON 格式的搜索结果
 */

const CONFIG_PATH = '../config/knowledge-base.json';

async function searchKnowledge(query, options = {}) {
  const config = require(CONFIG_PATH);
  
  // TODO: 使用 feishu_wiki 工具搜索知识库
  // 当前权限只有只读，可以搜索但不能写入
  
  console.log(`🔍 搜索知识库: "${query}"`);
  console.log(`📊 配置的空间数量：${config.spaces?.length || 0}`);
  
  // 模拟搜索结果（实际实现需要调用 feishu_wiki API）
  const mockResults = [
    {
      title: "示例文档 1",
      url: "https://example.feishu.cn/wiki/xxx",
      snippet: "这是搜索结果摘要..."
    }
  ];
  
  return {
    query,
    results: mockResults,
    timestamp: new Date().toISOString()
  };
}

// CLI 入口
if (require.main === module) {
  const query = process.argv[2];
  if (!query) {
    console.error('用法：node search-knowledge.js "搜索关键词"');
    process.exit(1);
  }
  
  searchKnowledge(query)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => {
      console.error('搜索失败:', err);
      process.exit(1);
    });
}

module.exports = { searchKnowledge };
