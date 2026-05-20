with open(r"c:\Einsmartbcknd\Einsmartfrntnd\src\pages\GlobalAcademicPerformancePage.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "informe" in line.lower() or "academico" in line.lower() or "académico" in line.lower() or "morosidad" in line.lower() or "ranking" in line.lower() or "estadistica" in line.lower() or "estadística" in line.lower():
        print(f"{i+1}: {line.strip()}")
