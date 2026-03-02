#!/bin/bash
# 飞书工单每日总结 - Cron 任务设置脚本
# 
# 用法：bash setup-cron.sh

echo "🔧 设置飞书工单每日总结定时任务..."

# 定时任务配置（每天 18:00 执行）
CRON_EXPR="0 18 * * *"
TASK_NAME="飞书工单每日总结"
SCRIPT_PATH="/home/admin/.openclaw/workspace/feishu-helpdesk/scripts/daily-summary.js"
PAYLOAD_TEXT="【定时任务】执行飞书工单每日总结"

echo ""
echo "📋 任务配置:"
echo "   名称：${TASK_NAME}"
echo "   时间：${CRON_EXPR} (每天 18:00)"
echo "   脚本：${SCRIPT_PATH}"
echo ""

# 方法 1：使用 openclaw cron add 命令
echo "⚙️  尝试使用方法 1 添加任务..."
openclaw cron add \
  --name "${TASK_NAME}" \
  --schedule-cron "${CRON_EXPR}" \
  --schedule-tz "Asia/Shanghai" \
  --payload-kind "systemEvent" \
  --payload-text "${PAYLOAD_TEXT}" \
  --session-target "main" \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ 任务添加成功!"
else
  echo "⚠️  方法 1 失败，请手动添加："
  echo ""
  echo "   openclaw cron add \\"
  echo "     --name \"${TASK_NAME}\" \\"
  echo "     --schedule-cron \"${CRON_EXPR}\" \\"
  echo "     --schedule-tz \"Asia/Shanghai\" \\"
  echo "     --payload-kind \"systemEvent\" \\"
  echo "     --payload-text \"${PAYLOAD_TEXT}\" \\"
  echo "     --session-target \"main\""
  echo ""
fi

echo ""
echo "📝 查看已添加的任务:"
echo "   openclaw cron list"
echo ""
echo "🧪 测试执行任务（替换 <JOB_ID>）:"
echo "   openclaw cron run --job-id <JOB_ID>"
