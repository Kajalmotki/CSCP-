import os
import json
import re

TEXT_FILES = [
    r"C:\Users\Siddharth\Downloads\cscp2025_module1.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module2.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module3.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module4.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module5.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module6.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module7.txt",
    r"C:\Users\Siddharth\Downloads\cscp2025_module8.txt",
]

OUTPUT_DIR = r"d:\REVOS-CM-AI\api\data"

def parse_txt_to_json():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for file_path in TEXT_FILES:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            
        module_id = file_path.split("module")[-1].split(".")[0]
        module_title = "Unknown Module Title"
        
        sections = []
        current_section = {"section_title": "Introduction", "paragraphs": []}
        
        current_paragraph = []
        
        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                if current_paragraph:
                    text = " ".join(current_paragraph).strip()
                    if text:
                        current_section["paragraphs"].append(text)
                    current_paragraph = []
                continue
                
            # Detect Module title
            m_match = re.match(r"^Module\s+\d+:\s*(.*)", line, re.IGNORECASE)
            if m_match and module_title == "Unknown Module Title":
                module_title = line
                # Merge next lines if it's broken over lines until an empty line
                j = idx + 1
                while j < len(lines) and lines[j].strip() != "":
                    module_title += " " + lines[j].strip()
                    j += 1
                continue
                
            # Detect Section title
            s_match = re.match(r"^Section\s+[A-Z0-9]+:\s*(.*)", line, re.IGNORECASE)
            if s_match:
                if current_paragraph:
                    text = " ".join(current_paragraph).strip()
                    if text:
                        current_section["paragraphs"].append(text)
                    current_paragraph = []
                
                if current_section["paragraphs"] or current_section["section_title"] != "Introduction":
                    sections.append(current_section)
                    
                current_section = {"section_title": line, "paragraphs": []}
                continue
                
            current_paragraph.append(line)
            
        if current_paragraph:
            text = " ".join(current_paragraph).strip()
            if text:
                current_section["paragraphs"].append(text)
                
        if current_section["paragraphs"] or current_section["section_title"] != "Introduction":
            sections.append(current_section)
            
        output_data = {
            "module_id": module_id,
            "module_title": module_title,
            "sections": sections
        }
        
        output_file = os.path.join(OUTPUT_DIR, f"cscp2025_module{module_id}.json")
        with open(output_file, "w", encoding="utf-8") as out_f:
            json.dump(output_data, out_f, indent=2, ensure_ascii=False)
            
        print(f"Generated: {output_file}")

if __name__ == "__main__":
    parse_txt_to_json()
