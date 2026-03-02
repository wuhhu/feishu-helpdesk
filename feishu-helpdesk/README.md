# 飞书服务台自动化 - 阶段一

> 立即可用版本，无需额外权限申请

## 功能清单

### ✅ 已实现
- [ ] 知识库搜索（只读）
- [ ] 手动触发应答（@机器人）
- [ ] 定时总结任务框架
- [ ] 总结输出到群消息/本地文件

### ❌ 待实现（需要权限）
- [ ] 自动监听工单创建
- [ ] 自动加入工单群聊
- [ ] 自动写入知识库

---

## 目录结构

```
feishu-helpdesk/
├── README.md           # 本文件
├── config/
│   ├── knowledge-base.json  # 知识库配置
│   └── cron-jobs.json       # 定时任务配置
├── scripts/
│   ├── search-knowledge.js  # 知识库搜索
│   ├── answer-question.js   # 问题应答
│   └── daily-summary.js     # 每日总结
├── logs/               # 运行日志
└── output/             # 总结输出
```

---

## 使用说明

### 1. 配置知识库

编辑 `config/knowledge-base.json`，填入你的知识库信息：

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

**如何获取空间 ID：**
1. 打开飞书知识库
2. 查看 URL：`https://your-company.feishu.cn/wiki/wik/space/SPACE_ID`
3. 复制 `SPACE_ID`

### 2. 手动触发应答

在群聊中使用以下格式：

```
@机器人 搜索：[你的问题]
@机器人 工单：[工单号]
```

示例：
```
@小助手 搜索：如何重置密码？
@小助手 工单：T20260302001
```

### 3. 定时总结

默认每天 18:00 自动执行总结任务，输出到：
- 指定群聊
- 本地文件 `output/daily-summary-YYYY-MM-DD.md`

---

## 定时任务配置

使用 OpenClaw cron 系统，任务配置在 `config/cron-jobs.json`。

### 查看现有任务
```bash
openclaw cron list
```

### 添加总结任务
```bash
openclaw cron add --job config/cron-jobs.json
```

---

## 权限说明

当前所需权限（已具备 ✅）：
- `wiki:wiki:readonly` - 读取知识库
- `search:docs:read` - 搜索文档
- `im:message:send_as_bot` - 发送消息
- `im:message.group_msg` - 群消息
- `im:message:readonly` - 读取聊天记录

---

## 下一步

完成阶段一后，申请以下权限升级到阶段二：
- `helpdesk:ticket:read` - 工单读取
- `wiki:wiki` (读写) - 知识库写入
- `docs:document.content:write` - 文档写入
