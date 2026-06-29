import os
import requests
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

OUTPUT_DIR = "downloads"
MAX_WORKERS = 5
MAX_RETRIES = 3
TIMEOUT = 20

os.makedirs(OUTPUT_DIR, exist_ok=True)

with open("link.txt", "r") as f:
    links = [line.strip() for line in f if line.strip()]


def download_file(index, link):
    parsed = urlparse(link)
    filename = os.path.basename(parsed.path)

    if not filename:
        filename = f"file_{index}"

    path = os.path.join(OUTPUT_DIR, filename)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"[{index}] Attempt {attempt}: {link}")

            r = requests.get(link, stream=True, timeout=TIMEOUT)
            r.raise_for_status()

            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            print(f"[{index}] ✅ Done: {filename}")
            return True

        except Exception as e:
            print(f"[{index}] ❌ Error (attempt {attempt}): {e}")
            time.sleep(2 * attempt)

    print(f"[{index}] 🚫 Failed after {MAX_RETRIES} attempts")
    return False


with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    futures = [
        executor.submit(download_file, i, link)
        for i, link in enumerate(links, start=1)
    ]

    for future in as_completed(futures):
        future.result()

print("All downloads finished.")
