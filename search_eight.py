with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\UnifiedClassBook.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(1650, 1950):
    if i < len(lines):
        line = lines[i]
        if "8" in line:
            print(f"{i+1}: {line.strip()}")
