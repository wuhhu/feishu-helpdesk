#!/usr/bin/env python3
"""
Excel 聊天记录转 JSON 工具

将飞书多维表格导出的 Excel 聊天记录转换为工单解析器可处理的 JSON 格式。

使用方法:
    python excel_to_json.py input.xlsx output.json
    python excel_to_json.py input.xlsx  # 输出到 input.json
"""

import pandas as pd
import json
import sys
import os


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


def excel_to_json(file_path):
    """
    读取 Excel 文件并转换为工单 JSON 格式
    
    Args:
        file_path: Excel 文件路径
        
    Returns:
        dict: 工单 JSON 数据
        
    Excel 文件必须包含以下列:
        - 关联工单列表
        - ticket_id
        - 消息发送人
        - 消息发送时间
        - 消息内容
    """
    # 读取 Excel 文件
    try:
        df = pd.read_excel(file_path)
        print(f"✅ 成功读取 Excel 文件：{file_path}")
        print(f"   行数：{len(df)}")
        print(f"   列：{list(df.columns)}")
    except Exception as e:
        print(f"❌ 读取 Excel 文件失败：{e}")
        sys.exit(1)
    
    # 检查必要的列是否存在
    required_columns = ['关联工单列表', 'ticket_id', '消息发送人', '消息发送时间', '消息内容']
    for col in required_columns:
        if col not in df.columns:
            print(f"❌ 错误：列 '{col}' 不存在于 Excel 文件中")
            print(f"   可用的列：{list(df.columns)}")
            sys.exit(1)
    
    # 提取数据并构建 JSON 对象
    result = {
        "name": convert_to_json_serializable(df['关联工单列表'].iloc[0]) if not df['关联工单列表'].empty else "",
        "ticket_id": convert_to_json_serializable(df['ticket_id'].iloc[0]) if not df['ticket_id'].empty else "",
        "msg": []
    }
    
    # 处理每条消息
    for index, row in df.iterrows():
        msg_entry = {
            "user_name": convert_to_json_serializable(row['消息发送人']),
            "date": convert_to_json_serializable(row['消息发送时间']),
            "content": convert_to_json_serializable(row['消息内容'])
        }
        result["msg"].append(msg_entry)
    
    print(f"✅ 成功转换 {len(result['msg'])} 条消息")
    
    return result


def process_file(input_path, output_path=None):
    """
    处理单个 Excel 文件
    
    Args:
        input_path: 输入 Excel 文件路径
        output_path: 输出 JSON 文件路径（可选）
    """
    # 转换 Excel 到 JSON
    result = excel_to_json(input_path)
    
    # 确定输出路径
    if not output_path:
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}.json"
    
    # 写入 JSON 文件
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"✅ JSON 已保存到：{output_path}")
    except Exception as e:
        print(f"❌ 写入 JSON 文件失败：{e}")
        sys.exit(1)
    
    return output_path


def batch_process(input_dir, output_dir=None):
    """
    批量处理目录中的所有 Excel 文件
    
    Args:
        input_dir: 输入目录路径
        output_dir: 输出目录路径（可选）
    """
    if not os.path.isdir(input_dir):
        print(f"❌ 错误：{input_dir} 不是有效的目录")
        sys.exit(1)
    
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 查找所有 Excel 文件
    excel_files = [f for f in os.listdir(input_dir) if f.endswith(('.xlsx', '.xls'))]
    
    if not excel_files:
        print(f"❌ 错误：在 {input_dir} 中未找到 Excel 文件")
        sys.exit(1)
    
    print(f"📂 找到 {len(excel_files)} 个 Excel 文件\n")
    
    results = []
    for excel_file in excel_files:
        input_path = os.path.join(input_dir, excel_file)
        
        if output_dir:
            output_path = os.path.join(output_dir, os.path.splitext(excel_file)[0] + '.json')
        else:
            output_path = None
        
        print(f"\n{'='*50}")
        print(f"处理：{excel_file}")
        print('='*50)
        
        try:
            output = process_file(input_path, output_path)
            results.append({
                'input': excel_file,
                'output': output,
                'status': 'success'
            })
        except Exception as e:
            print(f"❌ 处理失败：{e}")
            results.append({
                'input': excel_file,
                'output': None,
                'status': 'failed',
                'error': str(e)
            })
    
    # 输出统计
    print(f"\n{'='*50}")
    print("📊 处理统计")
    print('='*50)
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"成功：{success_count}/{len(results)}")
    
    if success_count < len(results):
        print("\n失败的文件:")
        for r in results:
            if r['status'] == 'failed':
                print(f"  - {r['input']}: {r.get('error', '未知错误')}")
    
    return results


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("📝 Excel 聊天记录转 JSON 工具\n")
        print("用法:")
        print("  单个文件：python excel_to_json.py input.xlsx [output.json]")
        print("  批量处理：python excel_to_json.py --batch input_dir [output_dir]")
        print("\n示例:")
        print("  python excel_to_json.py ticket_123.xlsx")
        print("  python excel_to_json.py ticket_123.xlsx ticket_123.json")
        print("  python excel_to_json.py --batch ./excel_files ./json_output")
        sys.exit(1)
    
    # 批量处理模式
    if sys.argv[1] == '--batch':
        input_dir = sys.argv[2] if len(sys.argv) > 2 else '.'
        output_dir = sys.argv[3] if len(sys.argv) > 3 else None
        batch_process(input_dir, output_dir)
    else:
        # 单个文件模式
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        process_file(input_path, output_path)


if __name__ == '__main__':
    main()
