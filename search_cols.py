with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\UnifiedClassBook.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Decreto 67" in line or "N1" in line or "maxGrades" in line or "Array.from" in line or "evaluations" in line:
        if "useEffect" not in line and "const" in line or "let" in line or "map" in line or "Decreto" in line:
            print(f"{i+1}: {line.strip()}")
