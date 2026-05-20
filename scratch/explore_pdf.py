import pypdf

reader = pypdf.PdfReader("NOTAS.pdf")
print("Number of pages:", len(reader.pages))
for idx, page in enumerate(reader.pages):
    print(f"\n--- Page {idx+1} ---")
    print("Keys in page:", page.keys())
    if "/Resources" in page:
        print("Resources:", page["/Resources"].keys())
        if "/XObject" in page["/Resources"]:
            print("XObjects:", page["/Resources"]["/XObject"].keys())
    print("Text extracted:")
    txt = page.extract_text()
    print(repr(txt))
