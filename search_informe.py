with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\UnifiedClassBook.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "informe" in line.lower() or "academico" in line.lower() or "académico" in line.lower():
        print(f"{i+1}: {line.strip()}")
