from pathlib import Path
import hashlib,json
app=Path(__file__).resolve().parents[1]
for file,digest in json.loads((app/"docs/walkthrough-sources.json").read_text()).items():
    assert hashlib.sha256((app/file).read_bytes()).hexdigest()==digest, f"Refresh the architecture walkthrough after editing {file}"
print("Walkthrough source hashes match.")
