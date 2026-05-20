with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\UnifiedClassBook.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "subjects" in line.lower() or "subject" in line.lower():
        if "const " in line or "let " in line or "api.get" in line:
            print(f"{i+1}: {line.strip()}")
