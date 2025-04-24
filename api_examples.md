## Client Usage Examples

Once the API server is running, use your `API_KEY` as a Bearer token in the `Authorization` header when calling endpoints.

1. Bash / curl
```bash
# Submit a new job
curl -X POST "http://localhost:8000/generate" \
     -H "Authorization: Bearer $API_KEY" \
     -F prompt="A scenic mountain sunrise" \
     -F duration=5 \
     -F image=@input.png
# Response: { "job_id": "<JOB_ID>" }

# Poll status
curl -X GET "http://localhost:8000/status/<JOB_ID>" \
     -H "Authorization: Bearer $API_KEY"
# Response: { "job_id": "<JOB_ID>", "status": "running", "progress": 45 }

# Download result (when status == "done")
curl -X GET "http://localhost:8000/download/<JOB_ID>" \
     -H "Authorization: Bearer $API_KEY" \
     --output output.mp4
```

2. Python (requests)
```python
import os, time, requests

API_KEY = os.getenv("API_KEY")
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# Submit job
with open("input.png", "rb") as img:
    files = {"image": img}
    data = {"prompt": "A scenic mountain sunrise", "duration": 5}
    resp = requests.post("http://localhost:8000/generate", headers=HEADERS, files=files, data=data)
job_id = resp.json()["job_id"]

# Poll until done or failed
while True:
    r = requests.get(f"http://localhost:8000/status/{job_id}", headers=HEADERS)
    s = r.json()
    print(s)
    if s["status"] in ("done", "failed"):
        break
    time.sleep(2)

if s["status"] == "done":
    # Download the output video
    r = requests.get(f"http://localhost:8000/download/{job_id}", headers=HEADERS, stream=True)
    with open("output.mp4", "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print("Saved output.mp4")
else:
    print("Job failed:", s.get("error"))
```

3. JavaScript (fetch)
```js
const API_KEY = process.env.API_KEY;
const BASE = "http://localhost:8000";

// Submit job
async function submitJob(file, prompt, duration) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("duration", duration);
  form.append("image", file);
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}` },
    body: form,
  });
  const { job_id } = await res.json();
  return job_id;
}

// Poll status
async function pollStatus(jobId) {
  const res = await fetch(`${BASE}/status/${jobId}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` },
  });
  return res.json();
}

// Download result
async function downloadResult(jobId) {
  const res = await fetch(`${BASE}/download/${jobId}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  // e.g., save blob or createObjectURL
  return blob;
}
```