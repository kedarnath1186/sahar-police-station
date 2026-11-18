import os
import subprocess
import time
import shutil

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = r"c:\Users\DELL\Desktop\Sahar Police Station\screenshots"
PROFILE_DIR = r"c:\temp\chrome_user_profile"

os.makedirs(OUTPUT_DIR, exist_ok=True)
if os.path.exists(PROFILE_DIR):
    try:
        shutil.rmtree(PROFILE_DIR)
    except:
        pass
os.makedirs(PROFILE_DIR, exist_ok=True)

PAGES = [
    ("01_login", "http://127.0.0.1:8000/login/"),
    ("02_dashboard", "http://127.0.0.1:8000/login/?auto_auth=officer"),
    ("03_accused_list", "http://127.0.0.1:8000/accused/"),
    ("04_accused_add", "http://127.0.0.1:8000/accused/add/"),
    ("05_accused_detail", "http://127.0.0.1:8000/accused/1/"),
    ("06_accused_table", "http://127.0.0.1:8000/accused/table/"),
    ("07_accused_map", "http://127.0.0.1:8000/accused/map/"),
    ("08_places_list", "http://127.0.0.1:8000/places/"),
    ("09_places_add", "http://127.0.0.1:8000/places/add/"),
]

SIZES = [
    ("desktop", "1280,800"),
    ("mobile", "375,812"),
]

print("Starting screenshot captures...")

for name, url in PAGES:
    for size_label, dims in SIZES:
        out_file = os.path.join(OUTPUT_DIR, f"{name}_{size_label}.png")
        temp_file = os.path.join(r"c:\temp", f"{name}_{size_label}.png")
        
        args = [
            CHROME_EXE,
            "--headless=new",
            f"--user-data-dir={PROFILE_DIR}",
            f"--window-size={dims}",
            f"--screenshot={temp_file}",
            "--hide-scrollbars",
            url
        ]
        
        subprocess.run(args, capture_output=True)
        if os.path.exists(temp_file):
            shutil.copy2(temp_file, out_file)
            print(f"Captured: {name}_{size_label}.png ({dims}) -> {os.path.getsize(out_file)} bytes")
        else:
            print(f"FAILED to capture: {name}_{size_label}.png")

print("All screenshots captured successfully!")
