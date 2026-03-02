#!/bin/bash
# 飞书工单每日总结 - Cron 任务设置脚本
# 
# 用法：bash setup-cron.sh

echo "🔧 设置飞书工单每日总结定时任务..."
echo ""

# 定时任务配置（每天 22:00 执行）
CRON_EXPR="0 22 * * *"
TASK_NAME="飞书工单每日总结"
PAYLOAD_TEXT="【定时任务】执行飞书工单每日总结 - 运行 node /home/admin/.openclaw/workspace/feishu-helpdesk/scripts/daily-summary.js"

echo "📋 任务配置:"
echo "   名称：${TASK_NAME}"
echo "   时间：${CRON_EXPR} (每天 22:00)"
echo "   功能：为每个已结束工单生成独立总结文档"
echo ""

# 尝试添加 cron 任务
echo "⚙️  添加定时任务..."
openclaw cron add \
  --name "${TASK_NAME}" \
  --schedule-cron "${CRON_EXPR}" \
  --schedule-tz "Asia/Shanghai" \
  --payload-kind "systemEvent" \
  --payload-text "${PAYLOAD_TEXT}" \
  --session-target "main"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 任务添加成功!"
else
  echo ""
  echo "⚠️  自动添加失败，请手动执行以下命令："
  echo ""
  echo "openclaw cron add \\"
  echo "  --name \"${TASK_NAME}\" \\"
  echo "  --schedule-cron \"${CRON_EXPR}\" \\"
  echo "  --schedule-tz \"Asia/Shanghai\" \\"
  echo "  --payload-kind \"systemEvent\" \\"
  echo "  --payload-text \"${PAYLOAD_TEXT}\" \\"
  echo "  --session-target \"main\""
  echo ""
fi

echo ""
echo "📝 验证任务:"
echo "   openclaw cron list"
echo ""
echo "🧪 测试执行（替换 <JOB_ID>）:"
echo "   openclaw cron run --job-id <JOB_ID>"
echo ""
echo "📂 输出位置:"
echo "   /home/admin/.openclaw/workspace/feishu-helpdesk/output/summary-YYYY-MM-DD/"
