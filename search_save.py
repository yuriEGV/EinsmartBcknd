with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\UnifiedClassBook.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "save" in line.lower() or "guardar" in line.lower():
        if "const " in line or "function" in line or "async" in line:
            print(f"{i+1}: {line.strip()}")
