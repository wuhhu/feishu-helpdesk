# 🚀 快速启动指南

## 第一步：配置知识库

1. 打开飞书，进入你的知识库
2. 从 URL 复制空间 ID（`/wiki/wik/space/SPACE_ID`）
3. 编辑 `config/knowledge-base.json`，填入空间 ID：

```json
{
  "spaces": [
    {
      "id": "你的空间 ID",
      "name": "IT 支持知识库",
      "enabled": true
    }
  ]
}
```

4. **重要**：在飞书知识库设置中，添加机器人为成员（只读即可）

---

## 第二步：测试脚本

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk

# 测试知识库搜索
node scripts/search-knowledge.js "密码重置"

# 测试问题应答
node scripts/answer-question.js "如何申请权限？"

# 测试每日总结
node scripts/daily-summary.js
```

---

## 第三步：配置定时任务

### 查看当前 cron 任务
```bash
openclaw cron list
```

### 添加每日总结任务
```bash
# 方法 1：运行脚本（推荐）
bash setup-cron.sh

# 方法 2：手动添加（每天 22:00 执行）
openclaw cron add \
  --name "飞书工单每日总结" \
  --schedule-cron "0 22 * * *" \
  --schedule-tz "Asia/Shanghai" \
  --payload-kind "systemEvent" \
  --payload-text "【定时任务】执行飞书工单每日总结 - 运行 node /home/admin/.openclaw/workspace/feishu-helpdesk/scripts/daily-summary.js" \
  --session-target "main"
```

### 测试定时任务
```bash
# 立即执行一次测试
openclaw cron run --job-id <任务 ID>
```

---

## 第四步：在群聊中使用

### 触发格式

在飞书群聊中@机器人：

```
@机器人 搜索：如何重置密码？
```

或

```
@机器人 我想了解报销流程
```

### 预期回复

```
🔍 根据知识库搜索，找到以下相关信息：

📌 **密码重置指南**
忘记密码时，请访问...

📌 **账户安全常见问题**
定期修改密码可以...

💡 如果以上信息未能解决您的问题，请补充更多细节或联系人工支持。
```

---

## 故障排查

### 问题：搜索返回空结果
- 检查知识库空间 ID 是否正确
- 确认机器人已添加到知识库空间（设置 → 成员）
- 检查关键词是否过于具体

### 问题：定时任务不执行
- 检查 cron 任务状态：`openclaw cron list`
- 查看任务历史：`openclaw cron runs --job-id <ID>`
- 确认 OpenClaw 服务正常运行

### 问题：机器人无响应
- 检查飞书应用配置
- 确认机器人已加入群聊
- 查看消息权限设置

---

## 下一步

阶段一运行稳定后，考虑升级到阶段二：

1. 申请飞书开放平台权限
2. 实现自动工单监听
3. 实现自动写入知识库

详情参考 `README.md`
