import sys
import os

try:
    import pypdf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    import pypdf

def read_pdf(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"\n--- PAGE {i+1} ---")
        print(page.extract_text()[:4000])

if __name__ == "__main__":
    read_pdf("NOTAS.pdf")
