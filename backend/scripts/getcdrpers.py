import wxcadm
from wxcadm.reports import ReportList
import time
from datetime import datetime
import os
import sys

if len(sys.argv) < 2:
    print("ERROR: You must provide an API token as an argument.")
    print("Usage: python getcdr.py \"YOUR_API_TOKEN\"")
    exit(1)

access_token = sys.argv[1]

webex = wxcadm.Webex(access_token)
reports = ReportList(webex)

print("Requesting CDR report for last 1 day...")
report = reports.cdr_report(days=1)
print(f"Created report: {report.title}")

start_time = time.time()
while True:
    status = report.status
    elapsed = time.time() - start_time
    print(f"[{datetime.utcnow().isoformat()}] Elapsed: {int(elapsed)}s — Report status: {status}")
    if status in ["done", "complete"]:
        break
    elif status in ["failed", "error"]:
        print("ERROR: Report generation failed.")
        exit(1)
    time.sleep(5)

lines = report.get_report_lines()

print(f"\n=== {len(lines)} CDR lines retrieved ===\n")
for line in lines[:10]:
    print(line)

target_folder = "/home/chris/Projects/v0-call-metrics-dashboard-local/backend/data/cdr_imports/"
os.makedirs(target_folder, exist_ok=True)

filename = f"cdr_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
file_path = os.path.join(target_folder, filename)

with open(file_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\nCDR report saved to: {file_path}")

