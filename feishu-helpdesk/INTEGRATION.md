# 🔌 OpenClaw 集成指南

本文档说明如何在 OpenClaw 中集成飞书服务台机器人。

---

## 架构说明

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│   飞书消息    │────▶│  OpenClaw    │────▶│  消息处理器      │
│  (群聊/@)    │     │  (主会话)    │     │  (openclaw-handler)│
└──────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  知识库搜索      │
                                         │  (search-knowledge)│
                                         └─────────────────┘
```

---

## 集成方式

### 方式一：在主会话中直接调用（推荐）

当 OpenClaw 收到飞书消息时，在主会话中调用处理器：

```javascript
// 在 OpenClaw 主会话中
const handler = require('/home/admin/.openclaw/workspace/feishu-helpdesk/scripts/openclaw-handler');

// 处理消息
const result = await handler.processFeishuMessage(message, {
  sender: 'user123',
  chatId: 'group456',
  isMentioned: true,
  channel: 'feishu'
});

// 如果处理成功，回复结果
if (result.handled && result.action === 'reply') {
  // 使用 sessions_send 或直接回复
  console.log(result.reply);
}
```

### 方式二：使用 sessions_spawn 创建专用处理会话

```bash
#  spawn 一个子会话处理消息
openclaw sessions spawn \
  --task "处理飞书消息：如何重置密码" \
  --label "feishu-handler"
```

### 方式三：配置消息钩子（需要 OpenClaw 配置权限）

在 `openclaw.json` 中添加消息处理钩子：

```json
{
  "hooks": {
    "message": {
      "feishu": {
        "handler": "/home/admin/.openclaw/workspace/feishu-helpdesk/scripts/openclaw-handler.js",
        "trigger": ["mention", "keyword"],
        "keywords": ["搜索", "工单", "helpdesk"]
      }
    }
  }
}
```

---

## 消息格式

### 触发条件

| 条件 | 示例 | 是否处理 |
|------|------|----------|
| 被@ | `@机器人 如何重置密码` | ✅ |
| 包含"搜索" | `搜索：报销流程` | ✅ |
| 包含"工单" | `工单 T20260302001` | ✅ |
| 飞书渠道 + 群聊 | `(群聊中的任何消息)` | ✅ |
| 普通聊天 | `今天天气不错` | ❌ |

### 回复格式

```
🔍 根据知识库搜索，找到以下相关信息：

📌 **密码重置指南**
忘记密码时，请访问 https://xxx 进行重置...

📌 **账户安全常见问题**
定期修改密码可以提高账户安全性...

💡 如未解决问题，请补充更多细节或联系人工支持。
```

---

## 配置步骤

### 1. 配置知识库

编辑 `config/knowledge-base.json`：

```json
{
  "spaces": [
    {
      "id": "你的空间 ID",
      "name": "IT 支持知识库",
      "enabled": true
    }
  ],
  "searchConfig": {
    "maxResults": 5,
    "includeSnippets": true
  },
  "answerTemplate": {
    "prefix": "🔍 根据知识库搜索，找到以下相关信息：\n\n",
    "itemFormat": "📌 **{title}**\n{snippet}\n\n",
    "suffix": "💡 如未解决问题，请补充更多细节或联系人工支持。"
  }
}
```

### 2. 测试处理器

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk/scripts

# 测试消息处理
node openclaw-handler.js

# 测试特定消息
node message-handler.js "搜索：如何重置密码" --mention
```

### 3. 在 OpenClaw 中集成

**方法 A：手动调用（立即可用）**

当你在 OpenClaw 中收到飞书消息时，手动运行：

```bash
node /home/admin/.openclaw/workspace/feishu-helpdesk/scripts/openclaw-handler.js
```

**方法 B：自动调用（需要配置）**

需要修改 OpenClaw 配置，添加消息处理钩子。

---

## 定时总结集成

### 配置 cron 任务

```bash
# 添加每日总结任务（每天 18:00）
openclaw cron add \
  --name "飞书工单每日总结" \
  --schedule-cron "0 18 * * *" \
  --schedule-tz "Asia/Shanghai" \
  --payload-kind "systemEvent" \
  --payload-text "执行飞书工单每日总结" \
  --session-target "main"
```

### cron 任务触发后的处理

当 cron 任务触发时，OpenClaw 收到系统事件：

```
【定时任务】执行飞书工单每日总结
```

此时运行：

```bash
node /home/admin/.openclaw/workspace/feishu-helpdesk/scripts/daily-summary.js
```

输出会保存到：
- `output/daily-summary-YYYY-MM-DD.md`
- 可选：发送到指定群聊

---

## 日志和监控

### 日志位置

```
/home/admin/.openclaw/workspace/feishu-helpdesk/logs/
├── handler.log      # 消息处理日志
├── search.log       # 搜索日志
├── summary.log      # 总结日志
└── error.log        # 错误日志
```

### 查看状态

```bash
# 查看 cron 任务状态
openclaw cron list

# 查看任务执行历史
openclaw cron runs --job-id <JOB_ID>

# 查看输出文件
ls -la /home/admin/.openclaw/workspace/feishu-helpdesk/output/
```

---

## 故障排查

### 问题：消息不触发处理

**检查：**
1. 消息是否满足触发条件（被@或包含关键词）
2. `shouldProcess()` 函数逻辑
3. OpenClaw 是否正确传递消息上下文

### 问题：搜索返回空结果

**检查：**
1. 知识库空间 ID 是否正确
2. 机器人是否有知识库访问权限
3. 搜索关键词是否过于具体

### 问题：cron 任务不执行

**检查：**
1. `openclaw cron list` 确认任务存在
2. 确认 OpenClaw 服务正常运行
3. 检查 cron 表达式时区是否正确

---

## 下一步

完成集成后：

1. ✅ 测试消息处理流程
2. ✅ 测试定时总结任务
3. ✅ 监控运行日志
4. 📋 收集用户反馈
5. 📈 升级到阶段二（自动化工单处理）

---

*最后更新：2026-03-02*
