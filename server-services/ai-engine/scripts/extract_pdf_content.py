"""
extract_pdf_content.py - PDF 文本抽取与预处理脚本

所属模块：ai-engine/scripts
功能简述：
    从心理学经典文献 PDF 中逐页提取文本，经清洗、分块后输出为 JSON 与合并文本，
    为后续预训练与知识库构建准备语料素材。
依赖关系：
    - PyPDF2：PDF 文本抽取
"""
import os
import re
import json
import PyPDF2
from pathlib import Path

# 待处理的 PDF 文件名列表
PDF_FILES = [
    "30203090--MT.pdf",
    "2027-88271-001--MD2.pdf",
    "2026-31818-001--MD.pdf",
    "2026-27653-001--PTSD.pdf"
]

# PDF 输入目录（位于项目上层的数据库资源目录）
PDF_DIR = Path(__file__).parent.parent.parent.parent / "database_4_ai_res"
# 清洗结果输出目录
OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def extract_text_from_pdf(pdf_path):
    """
    从 PDF 文件逐页提取文本内容。

    Args:
        pdf_path: PDF 文件路径

    Returns:
        str: 拼接后的全部文本；读取失败时返回空字符串
    """
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""

def clean_text(text):
    """
    文本清洗与格式标准化：合并多余换行/空格、去除控制字符、过滤过短行。

    Args:
        text: 原始文本

    Returns:
        str: 清洗后的文本
    """
    if not text:
        return ""

    # 合并连续换行与多余空格
    text = re.sub(r'\n+', '\n', text)
    text = re.sub(r' +', ' ', text)
    text = re.sub(r'(\n )+', '\n', text)

    # 去除控制字符与高位 ASCII 噪声
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)

    text = text.strip()

    # 过滤过短行（少于 10 字符的行视为噪声丢弃）
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if len(line) > 10:
            lines.append(line)

    return '\n'.join(lines)

def split_into_chunks(text, max_chunk_size=512):
    """
    将文本按行分割为不超过 max_chunk_size 的块。

    Args:
        text: 清洗后的文本
        max_chunk_size: 单个 chunk 的最大字符数，默认 512

    Returns:
        list: 分块后的文本列表
    """
    chunks = []
    current_chunk = ""

    for line in text.split('\n'):
        if len(current_chunk) + len(line) + 1 <= max_chunk_size:
            current_chunk += line + "\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = line + "\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def process_pdf_files():
    """
    处理所有 PDF 文件：抽取 → 清洗 → 分块 → 落盘，并输出合并文本与统计信息。

    Returns:
        tuple: (各文件信息列表, 处理统计字典)
    """
    all_texts = []

    for pdf_file in PDF_FILES:
        pdf_path = PDF_DIR / pdf_file
        print(f"Processing: {pdf_file}")

        if not pdf_path.exists():
            print(f"Warning: {pdf_file} not found")
            continue

        raw_text = extract_text_from_pdf(pdf_path)
        print(f"  Raw text length: {len(raw_text)} characters")

        if not raw_text:
            print(f"  No text extracted from {pdf_file}")
            continue

        cleaned_text = clean_text(raw_text)
        print(f"  Cleaned text length: {len(cleaned_text)} characters")

        chunks = split_into_chunks(cleaned_text)
        print(f"  Number of chunks: {len(chunks)}")

        file_info = {
            "filename": pdf_file,
            "total_chars_raw": len(raw_text),
            "total_chars_cleaned": len(cleaned_text),
            "num_chunks": len(chunks),
            "chunks": chunks
        }

        all_texts.append(file_info)

        # 单文件清洗结果落盘
        output_file = OUTPUT_DIR / f"{pdf_file.replace('.pdf', '_cleaned.json')}"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(file_info, f, ensure_ascii=False, indent=2)
        print(f"  Saved to: {output_file}")

    # 合并所有文件的 chunk 文本
    combined_text = "\n\n".join(
        "\n".join(file_info["chunks"])
        for file_info in all_texts
        if "chunks" in file_info
    )

    combined_file = OUTPUT_DIR / "combined_cleaned_text.txt"
    with open(combined_file, 'w', encoding='utf-8') as f:
        f.write(combined_text)
    print(f"\nCombined text saved to: {combined_file}")

    # 汇总处理统计
    stats = {
        "total_files": len(all_texts),
        "total_chars": len(combined_text),
        "total_chunks": sum(file_info["num_chunks"] for file_info in all_texts),
        "files": [file_info["filename"] for file_info in all_texts]
    }

    stats_file = OUTPUT_DIR / "processing_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"Processing stats saved to: {stats_file}")

    return all_texts, stats

if __name__ == "__main__":
    print("=" * 60)
    print("PDF Content Extraction and Preprocessing")
    print("=" * 60)
    print()

    all_texts, stats = process_pdf_files()

    print("\n" + "=" * 60)
    print("Processing Summary")
    print("=" * 60)
    print(f"Total files processed: {stats['total_files']}")
    print(f"Total characters extracted: {stats['total_chars']:,}")
    print(f"Total chunks created: {stats['total_chunks']}")
    print(f"Files processed: {', '.join(stats['files'])}")
    print()
    print("Data prepared successfully for pre-training!")