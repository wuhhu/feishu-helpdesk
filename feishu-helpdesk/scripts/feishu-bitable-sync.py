#!/usr/bin/env python3
"""
飞书多维表格数据同步工具

从飞书多维表格 API 直接读取聊天记录，转换为工单解析器可处理的 JSON 格式。

使用方法:
    python feishu-bitable-sync.py --config config.json
    python feishu-bitable-sync.py --app-token xxx --table-id xxx
"""

import pandas as pd
import json
import sys
import os
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional, Any


# ==================== 配置区域 ====================

# 飞书开放平台凭证（请替换为实际的 AK/SK）
# 获取方式：https://open.feishu.cn/app
APP_ID = ""  # 应用 App ID
APP_SECRET = ""  # 应用 App Secret

# 或者使用 access_token（如果已有）
ACCESS_TOKEN = ""

# 默认配置
DEFAULT_CONFIG = {
    "app_id": "",
    "app_secret": "",
    "access_token": "",
    "bitable_app_token": "",  # 多维表格 AppToken
    "bitable_table_id": "",   # 数据表 ID
    "output_dir": "../output/raw-data",  # JSON 输出目录
    "date_field": "工单日期",  # 日期字段名
    "status_field": "状态",    # 状态字段名
    "closed_status": "已结束",  # 已结束状态值
    "chat_record_field": "聊天记录",  # 聊天记录字段名
    "ticket_title_field": "工单标题",  # 工单标题字段名
    "ticket_id_field": "工单 ID"  # 工单 ID 字段名
}


# ==================== 数据类型转换（保持与 excel_to_json.py 一致） ====================

def convert_to_json_serializable(obj):
    """
    将 pandas/numpy 数据类型转换为 JSON 可序列化的 Python 内置类型
    
    Args:
        obj: 任意类型的对象
        
    Returns:
        JSON 可序列化的值
    """
    if pd.isna(obj):
        return ""
    elif hasattr(obj, 'item'):  # numpy 标量类型
        return obj.item()
    elif isinstance(obj, (pd.Timestamp, pd.DatetimeIndex)):
        return str(obj)
    else:
        return str(obj)


def excel_to_json(df: pd.DataFrame) -> List[Dict]:
    """
    将 DataFrame 转换为工单 JSON 列表
    
    Args:
        df: pandas DataFrame
        
    Returns:
        List[Dict]: 工单 JSON 列表
    """
    results = []
    
    # 按工单分组
    if 'ticket_id' not in df.columns:
        print("❌ 错误：DataFrame 中缺少 'ticket_id' 列")
        return []
    
    grouped = df.groupby('ticket_id')
    
    for ticket_id, group in grouped:
        # 提取工单信息
        result = {
            "name": convert_to_json_serializable(group['工单标题'].iloc[0]) if '工单标题' in group.columns and not group['工单标题'].empty else "",
            "ticket_id": convert_to_json_serializable(ticket_id),
            "msg": []
        }
        
        # 处理每条消息
        for index, row in group.iterrows():
            msg_entry = {
                "user_name": convert_to_json_serializable(row.get('消息发送人', '')),
                "date": convert_to_json_serializable(row.get('消息发送时间', '')),
                "content": convert_to_json_serializable(row.get('消息内容', ''))
            }
            result["msg"].append(msg_entry)
        
        results.append(result)
    
    return results


# ==================== 飞书 API 相关 ====================

class FeishuBitableAPI:
    """飞书多维表格 API 客户端"""
    
    def __init__(self, app_id: str = "", app_secret: str = "", access_token: str = ""):
        """
        初始化 API 客户端
        
        Args:
            app_id: 应用 App ID
            app_secret: 应用 App Secret
            access_token: Access Token（可选，如果提供则直接使用）
        """
        self.app_id = app_id or APP_ID
        self.app_secret = app_secret or APP_SECRET
        self.access_token = access_token or ACCESS_TOKEN
        self.base_url = "https://open.feishu.cn/open-apis"
        self.token_expire_time = 0
        
    def get_access_token(self) -> str:
        """获取访问令牌"""
        # 如果已有有效的 access_token，直接返回
        if self.access_token and time.time() < self.token_expire_time:
            return self.access_token
        
        # 否则通过 app_id 和 app_secret 获取
        if not self.app_id or not self.app_secret:
            print("⚠️  警告：未配置 app_id 或 app_secret")
            return ""
        
        url = f"{self.base_url}/auth/v3/tenant_access_token/internal"
        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') == 0:
                self.access_token = data['tenant_access_token']
                self.token_expire_time = time.time() + data['expire'] - 60  # 提前 60 秒过期
                print(f"✅ 成功获取 access_token，有效期：{data['expire']}秒")
                return self.access_token
            else:
                print(f"❌ 获取 access_token 失败：{data}")
                return ""
        except Exception as e:
            print(f"❌ 请求失败：{e}")
            return ""
    
    def get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        token = self.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def get_table_records(self, app_token: str, table_id: str, 
                          page_size: int = 100, 
                          filter_formula: str = "") -> List[Dict]:
        """
        获取多维表格数据
        
        Args:
            app_token: 多维表格 AppToken
            table_id: 数据表 ID
            page_size: 每页数量（最大 500）
            filter_formula: 筛选公式（可选）
            
        Returns:
            List[Dict]: 记录列表
        """
        url = f"{self.base_url}/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        headers = self.get_headers()
        
        all_records = []
        page_token = ""
        
        while True:
            params = {
                "page_size": min(page_size, 500)
            }
            
            if page_token:
                params["page_token"] = page_token
            
            if filter_formula:
                params["filter"] = filter_formula
            
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                if data.get('code') == 0:
                    records = data.get('data', {}).get('items', [])
                    all_records.extend(records)
                    print(f"📊 已获取 {len(all_records)} 条记录")
                    
                    # 检查是否有更多数据
                    has_more = data.get('data', {}).get('has_more', False)
                    if not has_more:
                        break
                    
                    page_token = data.get('data', {}).get('page_token', "")
                    if not page_token:
                        break
                    
                    # 避免请求过快
                    time.sleep(0.5)
                else:
                    print(f"❌ 获取数据失败：{data}")
                    break
                    
            except Exception as e:
                print(f"❌ 请求失败：{e}")
                break
        
        return all_records
    
    def download_file(self, file_key: str, save_path: str) -> bool:
        """
        下载文件（如图片）
        
        Args:
            file_key: 文件 key
            save_path: 保存路径
            
        Returns:
            bool: 是否成功
        """
        url = f"{self.base_url}/bitable/v1/apps/{file_key}/download"
        headers = self.get_headers()
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            with open(save_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✅ 文件已下载：{save_path}")
            return True
        except Exception as e:
            print(f"❌ 下载失败：{e}")
            return False


# ==================== 数据处理 ====================

def parse_chat_record(chat_record: Any) -> List[Dict]:
    """
    解析聊天记录字段
    
    飞书多维表格中的聊天记录可能是：
    1. JSON 字符串
    2. 文本（需要进一步解析）
    3. 数组
    
    Args:
        chat_record: 聊天记录原始数据
        
    Returns:
        List[Dict]: 解析后的消息列表
    """
    if not chat_record:
        return []
    
    # 如果是字符串，尝试解析 JSON
    if isinstance(chat_record, str):
        try:
            data = json.loads(chat_record)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'msg' in data:
                return data['msg']
        except:
            # 无法解析，返回原始文本
            return [{
                "user_name": "未知",
                "date": "",
                "content": chat_record
            }]
    
    # 如果已经是列表
    if isinstance(chat_record, list):
        return chat_record
    
    # 其他类型，转为字符串
    return [{
        "user_name": "未知",
        "date": "",
        "content": str(chat_record)
    }]


def transform_record(record: Dict, config: Dict) -> Optional[Dict]:
    """
    将多维表格记录转换为工单 JSON 格式
    
    Args:
        record: 多维表格记录
        config: 配置
        
    Returns:
        Dict: 工单 JSON 数据，如果无效则返回 None
    """
    fields = record.get('fields', {})
    
    # 提取工单 ID
    ticket_id = fields.get(config.get('ticket_id_field', '工单 ID'), '')
    if not ticket_id:
        return None
    
    # 提取工单标题
    ticket_title = fields.get(config.get('ticket_title_field', '工单标题'), '')
    
    # 提取聊天记录
    chat_record = fields.get(config.get('chat_record_field', '聊天记录'), '')
    messages = parse_chat_record(chat_record)
    
    # 构建 JSON 对象
    result = {
        "name": convert_to_json_serializable(ticket_title),
        "ticket_id": convert_to_json_serializable(ticket_id),
        "msg": []
    }
    
    # 处理每条消息
    for msg in messages:
        if isinstance(msg, dict):
            msg_entry = {
                "user_name": convert_to_json_serializable(msg.get('user_name', '')),
                "date": convert_to_json_serializable(msg.get('date', '')),
                "content": convert_to_json_serializable(msg.get('content', ''))
            }
            result["msg"].append(msg_entry)
    
    return result


# ==================== 主流程 ====================

def load_config(config_path: str) -> Dict:
    """加载配置文件"""
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            user_config = json.load(f)
        
        # 合并配置
        config = DEFAULT_CONFIG.copy()
        config.update(user_config)
        return config
    else:
        print(f"⚠️  配置文件不存在：{config_path}")
        print("📝 将使用默认配置（需要填写 AK/SK）")
        return DEFAULT_CONFIG.copy()


def sync_from_bitable(config: Dict, date_filter: str = "") -> List[Dict]:
    """
    从多维表格同步数据
    
    Args:
        config: 配置
        date_filter: 日期筛选（可选，格式：YYYY-MM-DD）
        
    Returns:
        List[Dict]: 工单 JSON 列表
    """
    api = FeishuBitableAPI(
        app_id=config.get('app_id', ''),
        app_secret=config.get('app_secret', ''),
        access_token=config.get('access_token', '')
    )
    
    app_token = config.get('bitable_app_token', '')
    table_id = config.get('bitable_table_id', '')
    
    if not app_token or not table_id:
        print("❌ 错误：未配置 bitable_app_token 或 bitable_table_id")
        return []
    
    # 构建筛选公式（筛选已结束的工单）
    filter_formula = ""
    if date_filter:
        # 筛选指定日期的工单
        filter_formula = f'AND({config["date_field"]}="{date_filter}",{config["status_field"]}="{config["closed_status"]}")'
    else:
        # 筛选所有已结束的工单
        filter_formula = f'{config["status_field"]}="{config["closed_status"]}"'
    
    print(f"📊 开始获取数据...")
    print(f"   AppToken: {app_token}")
    print(f"   数据表：{table_id}")
    print(f"   筛选条件：{filter_formula}")
    
    # 获取记录
    records = api.get_table_records(app_token, table_id, filter_formula=filter_formula)
    
    if not records:
        print("⚠️  未获取到任何记录")
        return []
    
    # 转换为工单 JSON 格式
    tickets = []
    for record in records:
        ticket = transform_record(record, config)
        if ticket:
            tickets.append(ticket)
    
    print(f"✅ 成功转换 {len(tickets)} 个工单")
    
    return tickets


def save_tickets(tickets: List[Dict], output_dir: str, date: str) -> List[str]:
    """
    保存工单 JSON 到文件
    
    Args:
        tickets: 工单列表
        output_dir: 输出目录
        date: 日期
        
    Returns:
        List[str]: 保存的文件路径列表
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    saved_files = []
    
    # 保存每个工单到独立文件
    for ticket in tickets:
        ticket_id = ticket.get('ticket_id', 'unknown')
        filename = f"ticket-{ticket_id}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(ticket, f, ensure_ascii=False, indent=2)
        
        saved_files.append(filepath)
    
    # 保存汇总文件
    summary_file = os.path.join(output_dir, f"summary-{date}.json")
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump({
            "date": date,
            "count": len(tickets),
            "tickets": tickets
        }, f, ensure_ascii=False, indent=2)
    
    saved_files.append(summary_file)
    
    return saved_files


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='飞书多维表格数据同步工具')
    parser.add_argument('--config', type=str, default='bitable-sync-config.json',
                        help='配置文件路径')
    parser.add_argument('--app-token', type=str, help='多维表格 AppToken')
    parser.add_argument('--table-id', type=str, help='数据表 ID')
    parser.add_argument('--date', type=str, help='日期筛选（YYYY-MM-DD）')
    parser.add_argument('--output', type=str, help='输出目录')
    parser.add_argument('--app-id', type=str, help='应用 App ID')
    parser.add_argument('--app-secret', type=str, help='应用 App Secret')
    
    args = parser.parse_args()
    
    # 加载配置
    config = load_config(args.config)
    
    # 命令行参数覆盖配置
    if args.app_token:
        config['bitable_app_token'] = args.app_token
    if args.table_id:
        config['bitable_table_id'] = args.table_id
    if args.date:
        date_filter = args.date
    else:
        date_filter = datetime.now().strftime('%Y-%m-%d')
    if args.output:
        config['output_dir'] = args.output
    if args.app_id:
        config['app_id'] = args.app_id
    if args.app_secret:
        config['app_secret'] = args.app_secret
    
    # 检查配置
    if not config['app_id'] or not config['app_secret']:
        print("⚠️  警告：未配置 app_id 或 app_secret")
        print("   请在配置文件或命令行中提供")
        print("\n配置方式:")
        print("  1. 编辑 bitable-sync-config.json")
        print("  2. 使用命令行参数：--app-id xxx --app-secret xxx")
        print("\n获取 AK/SK:")
        print("  https://open.feishu.cn/app")
        return
    
    # 执行同步
    tickets = sync_from_bitable(config, date_filter)
    
    if not tickets:
        print("⚠️  没有需要同步的工单")
        return
    
    # 保存结果
    output_dir = config['output_dir']
    saved_files = save_tickets(tickets, output_dir, date_filter)
    
    print(f"\n✅ 同步完成！")
    print(f"📂 输出目录：{output_dir}")
    print(f"📄 生成文件：{len(saved_files)} 个")
    for f in saved_files:
        print(f"   - {f}")


if __name__ == '__main__':
    main()
