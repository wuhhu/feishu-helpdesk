# 📊 飞书多维表格 API 同步工具

从飞书多维表格 API 直接读取聊天记录，自动转换为工单解析器可处理的 JSON 格式。

---

## 🎯 用途

直接从飞书多维表格 API 读取数据，无需手动导出 Excel。

**适用场景：**
- 需要自动化同步工单数据
- 定时任务自动执行
- 实时获取最新工单

---

## ⚙️ 配置说明

### 1. 获取飞书开放平台凭证

**步骤：**

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 创建企业自建应用
3. 获取凭证管理中的：
   - **App ID** (应用 ID)
   - **App Secret** (应用密钥)

### 2. 配置多维表格权限

在应用管理后台：

1. 添加权限：
   - `bitable:app` - 读取多维表格
   - `bitable:app:readonly` - 只读权限

2. 发布应用

### 3. 获取多维表格信息

1. 打开飞书多维表格
2. 从 URL 获取：
   - **AppToken**: `/base/` 后面的部分
   - **TableId**: `/table/` 后面的部分

示例 URL：
```
https://your-company.feishu.cn/base/bascnXXX123?table=tblXXX456
                                      ↑ AppToken       ↑ TableId
```

### 4. 编辑配置文件

编辑 `bitable-sync-config.json`：

```json
{
  "app_id": "cli_xxx",           // 从飞书开放平台获取
  "app_secret": "xxx",           // 从飞书开放平台获取
  "bitable_app_token": "bascnXXX123",
  "bitable_table_id": "tblXXX456",
  "output_dir": "../output/raw-data",
  "date_field": "工单日期",
  "status_field": "状态",
  "closed_status": "已结束",
  "chat_record_field": "聊天记录",
  "ticket_title_field": "工单标题",
  "ticket_id_field": "工单 ID"
}
```

---

## 🚀 使用方法

### 安装依赖

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk/scripts
pip install -r requirements.txt
```

### 方式一：使用配置文件

```bash
# 使用默认配置文件
python feishu-bitable-sync.py --config bitable-sync-config.json

# 使用指定日期的数据
python feishu-bitable-sync.py --config bitable-sync-config.json --date 2024-08-08
```

### 方式二：命令行参数

```bash
python feishu-bitable-sync.py \
  --app-id cli_xxx \
  --app-secret xxx \
  --app-token bascnXXX123 \
  --table-id tblXXX456 \
  --date 2024-08-08 \
  --output ../output/raw-data
```

### 方式三：混合使用

```bash
# 配置文件 + 命令行覆盖
python feishu-bitable-sync.py \
  --config bitable-sync-config.json \
  --date 2024-08-08 \
  --output ../output/today
```

---

## 📊 输出格式

### 输出目录结构

```
output/
└── raw-data/
    ├── ticket-7400576031599525892.json    # 工单 1
    ├── ticket-7400576031599525893.json    # 工单 2
    └── summary-2024-08-08.json            # 汇总文件
```

### 单个工单 JSON 格式

```json
{
  "name": "滴滴金融 ID：93924；每天外呼结束后...",
  "ticket_id": "7400576031599525892",
  "msg": [
    {
      "user_name": "招财",
      "date": "2024-08-08 09:34:41",
      "content": "AICC"
    },
    {
      "user_name": "算盘",
      "date": "2024-08-08 09:53:58",
      "content": "单个任务打不完？"
    }
  ]
}
```

### 汇总文件格式

```json
{
  "date": "2024-08-08",
  "count": 10,
  "tickets": [...]
}
```

---

## 🔄 完整工作流程

```
飞书多维表格 API
    ↓ feishu-bitable-sync.py
JSON 文件 (output/raw-data/)
    ↓ ticket-parser.js
工单总结 Markdown (output/summary-YYYY-MM-DD/)
```

### 自动化脚本示例

```bash
#!/bin/bash
# sync-and-summary.sh - 同步并生成总结

DATE=$(date +%Y-%m-%d)

# 1. 从 API 同步数据
python feishu-bitable-sync.py \
  --config bitable-sync-config.json \
  --date $DATE

# 2. 生成总结
node daily-summary.js

# 3. （可选）上传到知识库
# 阶段二实现
```

---

## 🔧 高级配置

### 筛选条件

```json
{
  "status_field": "状态",
  "closed_status": "已结束",
  "date_field": "工单日期"
}
```

会自动生成筛选公式：
```
AND(工单日期="2024-08-08", 状态="已结束")
```

### 字段映射

如果多维表格字段名不同，可以自定义：

```json
{
  "chat_record_field": "聊天历史",
  "ticket_title_field": "问题描述",
  "ticket_id_field": "工单编号"
}
```

---

## ⚠️ 注意事项

### 1. 权限配置
- 确保应用已发布
- 确保有多维表格读取权限
- 确保机器人已添加到多维表格成员

### 2. API 限流
- 单次请求最多 500 条记录
- 自动分页获取
- 请求间隔 0.5 秒避免限流

### 3. 数据安全
- **不要将 AK/SK 提交到 Git**
- 使用 `.gitignore` 忽略配置文件
- 或使用环境变量

### 4. Token 管理
- Access Token 自动获取和刷新
- 有效期 2 小时
- 提前 60 秒刷新

---

## 🧪 测试

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk/scripts

# 测试连接（不获取数据）
python -c "from feishu_bitable_sync import FeishuBitableAPI; api = FeishuBitableAPI('app_id', 'app_secret'); print(api.get_access_token())"

# 测试获取数据
python feishu-bitable-sync.py --config bitable-sync-config.json --date 2024-08-08

# 查看输出
ls -la ../output/raw-data/
cat ../output/raw-data/summary-2024-08-08.json
```

---

## 🔗 相关文档

| 文档 | 用途 |
|------|------|
| `Excel 转 JSON 工具.md` | Excel 导出方式 |
| `数据格式说明.md` | JSON 数据格式 |
| `配置多维表格.md` | 多维表格配置 |
| `ticket-parser.js` | 工单解析器 |

---

## 📞 获取帮助

### 飞书开放平台文档
- [多维表格 API](https://open.feishu.cn/document/ukTMukTMukTM/uAjUwUjLxYjN14SO3gTN)
- [权限管理](https://open.feishu.cn/document/home/authorization-process)
- [访问令牌](https://open.feishu.cn/document/ukTMukTMukTM/ukDNz4SO0MjL5QzM)

### 常见问题
- Q: 获取 access_token 失败？
- A: 检查 app_id 和 app_secret 是否正确

- Q: 获取不到数据？
- A: 检查多维表格权限和字段映射

---

*最后更新：2026-03-02*
