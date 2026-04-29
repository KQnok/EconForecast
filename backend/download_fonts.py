import os, urllib.request

os.makedirs("fonts", exist_ok=True)

fonts = {
    "DejaVuSans.ttf": "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf",
    "DejaVuSans-Bold.ttf": "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf",
}

for name, url in fonts.items():
    path = f"fonts/{name}"
    if os.path.exists(path):
        print(f"  {name} — уже есть")
        continue
    print(f"  Скачиваю {name}...")
    urllib.request.urlretrieve(url, path)
    print(f"  {name} — готово")

print("Готово!")