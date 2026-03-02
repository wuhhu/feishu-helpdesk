# 飞书服务台自动化

> 阶段一：知识库问答 + 工单总结（本地输出）

---

## 🎯 功能概述

### 1. 工单群智能应答

当用户在工单群@机器人时：
- ✅ 自动识别问题
- ✅ 搜索知识库
- ✅ 汇总回复

**不读取工单信息**，只根据知识库内容回复。

### 2. 每日工单总结

每天 22:00 自动执行：
- ✅ 从飞书多维表格读取工单数据
- ✅ 为每个工单生成独立总结文档
- ✅ **智能分析问题类别**（9 种类型自动识别）
- ✅ **智能分析问题标签**（5 种根因自动匹配）
- ✅ 输出到本地目录

---

## 📁 目录结构

```
feishu-helpdesk/
├── README.md                 # 本文件
├── 需要配置的内容.md          # 配置清单
├── 配置多维表格.md            # 多维表格配置指南
├── 配置定时任务.md            # 定时任务配置指南
├── QUICKSTART.md             # 快速启动
├── INTEGRATION.md            # OpenClaw 集成
├── config/
│   ├── knowledge-base.json   # 知识库配置
│   ├── bitable-config.json   # 多维表格配置 ⭐
│   └── cron-jobs.json        # 定时任务配置
├── scripts/
│   ├── main.js               # 主入口
│   ├── search-knowledge.js   # 知识库搜索
│   ├── message-handler.js    # 消息处理 ⭐
│   └── daily-summary.js      # 每日总结 ⭐
└── output/
    └── summary-YYYY-MM-DD/   # 总结输出
```

---

## ⚙️ 配置步骤

### 必须配置（2 项）

#### 1️⃣ 配置知识库空间 ID

编辑 `config/knowledge-base.json`：
```json
{
  "spaces": [
    {
      "id": "你的知识库空间 ID",
      "name": "IT 支持知识库",
      "enabled": true
    }
  ]
}
```

**获取方法：** 飞书知识库 URL → `/wiki/wik/space/SPACE_ID`

#### 2️⃣ 配置多维表格

编辑 `config/bitable-config.json`：
```json
{
  "bitableAppToken": "bascnXXX123",
  "bitableTableId": "tblXXX456",
  "fieldMapping": {
    "ticketId": "工单号",
    "requester": "工单提出人",
    "assignee": "工单对接人",
    "problemDesc": "问题描述",
    "rootCause": "问题根因",
    "solution": "解决方案",
    "category": "问题类别",
    "tags": "问题标签"
  }
}
```

**获取方法：** 详见 `配置多维表格.md`

---

## 🚀 使用方式

### 工单群应答

用户在群聊中@机器人：

```
@机器人 如何重置密码？
```

机器人回复：
```
🔍 根据知识库搜索，找到以下相关信息：

📌 **密码重置指南**
忘记密码时，请访问...

💡 如未解决问题，请补充更多细节或联系人工支持。
```

### 定时总结

每天 22:00 自动执行，输出：
```
output/summary-2026-03-02/
├── ticket-T20260302001.md    # 工单 1 总结
├── ticket-T20260302002.md    # 工单 2 总结
└── daily-overview.md         # 每日总览
```

**工单总结格式：**
```markdown
# 工单总结：T20260302001

## 基本信息
- 工单提出日期：2026-03-02
- 工单提出人：招财
- 工单对接人：算盘

## 问题描述
用户报告智能外呼任务结束后总有少量数据无法完成...

## 问题根因
客户在下午 4-5 点非工作时间偷偷往任务中添加新数据...

## 解决方案
建议客户规范数据上传时间...

## 问题类别
智能外呼  ← 自动分析

## 问题标签
操作不当  ← 自动分析
```

---

## 📋 定时任务配置

### 添加任务
```bash
openclaw cron add \
  --name "飞书工单每日总结" \
  --schedule-cron "0 22 * * *" \
  --schedule-tz "Asia/Shanghai" \
  --payload-kind "systemEvent" \
  --payload-text "【定时任务】执行飞书工单每日总结" \
  --session-target "main"
```

### 验证
```bash
openclaw cron list
openclaw cron run --job-id <JOB_ID>
```

---

## 🧪 测试

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk

# 测试消息处理
node scripts/message-handler.js "@机器人 如何重置密码" --mention

# 测试总结生成
node scripts/daily-summary.js

# 测试知识库搜索
node scripts/search-knowledge.js "密码重置"
```

---

## ⚠️ 阶段一限制

### 已实现
- ✅ 知识库搜索回复
- ✅ 消息处理（@机器人触发）
- ✅ 定时总结框架
- ✅ 本地文件输出

### 待实现（需要权限）
- ⏳ 从多维表格读取实际数据（需要 `bitable:app:read`）
- ⏳ 上传总结到知识库（需要 `wiki:wiki:write`）

---

## 📚 文档

| 文档 | 用途 |
|------|------|
| `需要配置的内容.md` | 完整配置清单 |
| `配置多维表格.md` | 多维表格配置指南 |
| `配置定时任务.md` | 定时任务配置指南 |
| `QUICKSTART.md` | 快速启动指南 |
| `INTEGRATION.md` | OpenClaw 集成 |

---

*最后更新：2026-03-02*
