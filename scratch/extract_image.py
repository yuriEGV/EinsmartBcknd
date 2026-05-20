import pypdf

reader = pypdf.PdfReader("NOTAS.pdf")
page = reader.pages[0]
xobject = page["/Resources"]["/XObject"].get_object()

for obj_name in xobject:
    if xobject[obj_name]["/Subtype"] == "/Image":
        size = (xobject[obj_name]["/Width"], xobject[obj_name]["/Height"])
        data = xobject[obj_name].get_data()
        if xobject[obj_name]["/ColorSpace"] == "/DeviceRGB":
            mode = "RGB"
        else:
            mode = "P"

        filename = obj_name[1:] + ".png"
        print(f"Found image: {obj_name}, size: {size}, len(data): {len(data)}")
        
        # Save image bytes directly
        try:
            with open(filename, "wb") as f:
                f.write(data)
            print(f"Saved raw image as {filename}")
        except Exception as e:
            print("Error saving image:", e)
