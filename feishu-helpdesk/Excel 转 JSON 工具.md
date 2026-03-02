# 📊 Excel 转 JSON 工具

将飞书多维表格导出的 Excel 聊天记录转换为工单解析器可处理的 JSON 格式。

---

## 🎯 用途

飞书多维表格导出的是 Excel 格式，需要转换为 JSON 才能被工单解析器处理。

---

## 📋 Excel 格式要求

Excel 文件必须包含以下列：

| 列名 | 说明 | 示例 |
|------|------|------|
| **关联工单列表** | 工单标题/描述 | "滴滴金融 ID：93924；每天外呼结束后..." |
| **ticket_id** | 工单 ID | 7400576031599525892 |
| **消息发送人** | 发送者姓名 | "招财" |
| **消息发送时间** | 发送时间 | "2024-08-08 09:55:37" |
| **消息内容** | 消息内容 | "这个是昨天的任务，显示有 8 条没打完" |

---

## 🚀 使用方法

### 安装依赖

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk/scripts
pip install -r requirements.txt
```

### 单个文件转换

```bash
# 输出到同名 JSON 文件
python excel_to_json.py ticket_123.xlsx

# 指定输出文件名
python excel_to_json.py ticket_123.xlsx ticket_123.json
```

### 批量转换

```bash
# 转换目录下所有 Excel 文件
python excel_to_json.py --batch ./excel_files

# 指定输出目录
python excel_to_json.py --batch ./excel_files ./json_output
```

---

## 📊 转换示例

### 输入（Excel）

| 关联工单列表 | ticket_id | 消息发送人 | 消息发送时间 | 消息内容 |
|------------|-----------|-----------|-------------|---------|
| 滴滴金融 ID：93924... | 7400576031599525892 | 招财 | 2024-08-08 09:34:41 | AICC |
| 滴滴金融 ID：93924... | 7400576031599525892 | 招财 | 2024-08-08 09:35:05 | 外呼过程中自动暂停... |
| 滴滴金融 ID：93924... | 7400576031599525892 | 算盘 | 2024-08-08 09:53:58 | 单个任务打不完？ |

### 输出（JSON）

```json
{
  "name": "滴滴金融 ID：93924；每天外呼结束后...",
  "ticket_id": 7400576031599525892,
  "msg": [
    {
      "user_name": "招财",
      "date": "2024-08-08 09:34:41",
      "content": "AICC"
    },
    {
      "user_name": "招财",
      "date": "2024-08-08 09:35:05",
      "content": "外呼过程中自动暂停..."
    },
    {
      "user_name": "算盘",
      "date": "2024-08-08 09:53:58",
      "content": "单个任务打不完？"
    }
  ]
}
```

---

## 🔧 完整流程

```
飞书多维表格
    ↓ 导出
Excel 文件
    ↓ python excel_to_json.py
JSON 文件
    ↓ ticket-parser.js 解析
工单总结 Markdown
```

---

## 🧪 测试

```bash
cd /home/admin/.openclaw/workspace/feishu-helpdesk/scripts

# 测试转换（需要示例 Excel 文件）
python excel_to_json.py test.xlsx

# 查看输出
cat test.json
```

---

## ⚠️ 注意事项

1. **日期格式**：确保 Excel 中的日期是文本格式，不是 Excel 日期格式
2. **空值处理**：空单元格会被转换为空字符串 `""`
3. **编码**：输出 JSON 使用 UTF-8 编码，支持中文
4. **大文件**：单个 Excel 文件建议不超过 10000 行

---

## 📦 依赖说明

| 包 | 用途 | 版本 |
|---|------|------|
| pandas | 数据处理 | >=2.0.0 |
| openpyxl | Excel 读取 | >=3.1.0 |

---

## 🔗 相关文档

- `数据格式说明.md` - JSON 数据格式说明
- `ticket-parser.js` - 工单解析器
- `daily-summary.js` - 每日总结生成器

---

*最后更新：2026-03-02*
