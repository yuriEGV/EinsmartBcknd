import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def extract_docx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            # Read word/document.xml
            xml_content = zip_ref.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # Find all text elements
            # Namespaces are usually like {http://schemas.openxmlformats.org/wordprocessingml/2006/main}t
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_parts = []
            for t in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if t.text:
                    text_parts.append(t.text)
            
            print(" ".join(text_parts))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_docx(sys.argv[1])
    else:
        print("No file provided")
