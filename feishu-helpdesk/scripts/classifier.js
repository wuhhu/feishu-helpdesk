#!/usr/bin/env node
/**
 * 工单智能分类器
 * 
 * 根据问题内容自动分析：
 * 1. 问题类别（从预定义列表中选择）
 * 2. 问题标签（根据根因从预定义列表中选择）
 */

// 预定义的问题类别
const PROBLEM_CATEGORIES = [
  'MA 画布',
  '智能外呼',
  'bot（话术）',
  '智能体 bot（话术）',
  '对账问题',
  '数据异常',
  '私有化问题',
  '海外问题',
  '政务问题'
];

// 预定义的问题标签（根据根因分类）
const PROBLEM_TAGS = [
  '系统处理逻辑缺陷',
  '接口与集成故障',
  '数据质量与校验缺失',
  '系统可靠性与可观测性不足',
  '操作不当'
];

/**
 * 关键词匹配规则
 */
const CATEGORY_KEYWORDS = {
  'MA 画布': [
    'MA', '画布', '营销画布', '流程画布', '客户旅程', '触点', '营销自动化',
    'MA 流程', '画布节点', '旅程设计'
  ],
  '智能外呼': [
    '外呼', '呼叫', '电话', '拨打', '呼叫任务', '外呼任务', '呼叫系统',
    '重呼', '呼叫失败', '呼叫完成', '呼叫数据', '呼叫量', '接通率'
  ],
  'bot（话术）': [
    'bot', '话术', '机器人', '自动回复', '问答', '对话', '聊天机器人',
    '客服 bot', '话术配置', '话术流程', '回复规则'
  ],
  '智能体 bot（话术）': [
    '智能体', 'AI bot', 'AI 话术', '智能对话', '语义理解', '意图识别',
    'NLP', '自然语言', '智能回复', 'AI 助手'
  ],
  '对账问题': [
    '对账', '账务', '结算', '金额', '账目', '核对', '差异', '账单',
    '支付', '收款', '财务', '资金', '账实不符'
  ],
  '数据异常': [
    '数据', '异常', '不一致', '错误', '缺失', '重复', '脏数据',
    '数据质量', '数据同步', '数据导入', '数据导出', '数据显示'
  ],
  '私有化问题': [
    '私有化', '本地部署', '私有云', '本地化', 'on-premise', '私有环境',
    '客户环境', '本地服务器', '内网部署'
  ],
  '海外问题': [
    '海外', '国际', '境外', '跨境', '多语言', '时区', '海外客户',
    '国际化', '海外部署', '海外节点'
  ],
  '政务问题': [
    '政务', '政府', '政务云', '政务系统', '政府部门', '政务项目',
    '政务客户', '政务环境', '信创'
  ]
};

/**
 * 根因关键词匹配规则
 */
const TAG_KEYWORDS = {
  '系统处理逻辑缺陷': [
    '逻辑', '判断', '条件', '流程', '规则', '算法', '计算错误',
    '处理顺序', '状态机', '业务逻辑', '逻辑漏洞', '逻辑错误'
  ],
  '接口与集成故障': [
    '接口', 'API', '集成', '第三方', '对接', '调用失败', '连接',
    '超时', '网络', '服务不可用', '回调', 'webhook', 'SDK'
  ],
  '数据质量与校验缺失': [
    '校验', '验证', '数据质量', '格式', '必填', '数据类型',
    '数据清洗', '数据规范', '输入验证', '数据完整性'
  ],
  '系统可靠性与可观测性不足': [
    '监控', '日志', '告警', '性能', '稳定性', '可用性', '故障',
    '宕机', '响应慢', '资源', '容量', '可观测性', '追踪'
  ],
  '操作不当': [
    '操作', '配置', '设置', '使用', '误操作', '人为', '操作失误',
    '配置错误', '使用方式', '操作步骤', '不规范', '客户', '时间',
    '添加', '上传', '输入', '手动', '人工'
  ]
};

/**
 * 分析问题类别
 * @param {string} problemDesc - 问题描述
 * @param {string} rootCause - 问题根因（可选）
 * @returns {string} 问题类别
 */
function analyzeCategory(problemDesc, rootCause = '') {
  const text = `${problemDesc} ${rootCause}`.toLowerCase();
  
  const scores = {};
  
  // 计算每个类别的匹配分数
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }
  
  // 返回得分最高的类别
  const bestMatch = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0];
  
  return bestMatch ? bestMatch[0] : '未分类';
}

/**
 * 分析问题标签（根据根因）
 * @param {string} rootCause - 问题根因
 * @param {string} problemDesc - 问题描述（可选）
 * @returns {string[]} 问题标签列表
 */
function analyzeTags(rootCause, problemDesc = '') {
  const text = `${problemDesc} ${rootCause}`.toLowerCase();
  
  const matchedTags = [];
  
  // 计算每个标签的匹配分数
  const scores = {};
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > 0) {
      scores[tag] = score;
    }
  }
  
  // 返回得分最高的标签（最多 2 个）
  const sortedTags = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(entry => entry[0]);
  
  return sortedTags.length > 0 ? sortedTags : ['未分类'];
}

/**
 * 完整分类分析
 * @param {object} ticket - 工单数据
 * @returns {object} 分类结果
 */
function classifyTicket(ticket) {
  const { problemDesc = '', rootCause = '' } = ticket;
  
  const category = analyzeCategory(problemDesc, rootCause);
  const tags = analyzeTags(rootCause, problemDesc);
  
  return {
    category,
    tags,
    confidence: 'auto'
  };
}

// CLI 测试入口
if (require.main === module) {
  const testCases = [
    {
      desc: '用户报告智能外呼任务结束后总有少量数据无法完成，需等到第二天重呼',
      cause: '客户在下午 4-5 点非工作时间偷偷往任务中添加新数据，导致系统误判任务完成'
    },
    {
      desc: 'MA 画布流程执行到某个节点时卡住，无法继续',
      cause: '节点之间的数据传递逻辑存在缺陷'
    },
    {
      desc: 'bot 机器人回复内容不正确',
      cause: '话术配置错误，操作人员配置了错误的回复规则'
    },
    {
      desc: '海外客户反馈系统访问慢',
      cause: '海外节点网络延迟高，缺少 CDN 加速'
    }
  ];
  
  console.log('🧪 分类器测试\n');
  
  testCases.forEach((test, i) => {
    console.log(`--- 测试 ${i + 1} ---`);
    console.log(`问题描述：${test.desc}`);
    console.log(`问题根因：${test.cause}`);
    
    const result = classifyTicket({
      problemDesc: test.desc,
      rootCause: test.cause
    });
    
    console.log(`问题类别：${result.category}`);
    console.log(`问题标签：${result.tags.join(', ')}`);
    console.log('');
  });
}

module.exports = {
  analyzeCategory,
  analyzeTags,
  classifyTicket,
  PROBLEM_CATEGORIES,
  PROBLEM_TAGS
};
