#!/usr/bin/env python3
import requests
import time
from datetime import datetime
import os
import sys
import json

if len(sys.argv) < 2:
    print("ERROR: You must provide an API token as an argument.")
    print("Usage: python get_cdr.py \"YOUR_API_TOKEN\"")
    exit(1)

access_token = sys.argv[1]
days = int(sys.argv[2]) if len(sys.argv) > 2 else 1

def make_webex_request(method, url, headers, data=None):
    """Make a request to Webex API with error handling"""
    try:
        if method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=30)
        else:
            response = requests.get(url, headers=headers, timeout=30)
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"API request failed: {e}")

try:
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    print(f"Requesting CDR report for last {days} day(s)...")
    
    # Step 1: Generate CDR report
    report_request = {
        "templateId": "cdr",
        "days": days
    }
    
    print(f"Generating report with payload: {json.dumps(report_request)}")
    generate_response = make_webex_request('POST', 'https://webexapis.com/v1/reports', headers, report_request)
    
    report_id = generate_response.get('id')
    if not report_id:
        raise Exception("No report ID returned from API")
    
    print(f"Created report with ID: {report_id}")

    # Step 2: Poll for completion
    start_time = time.time()
    max_wait_time = 300  # 5 minutes
    
    while True:
        elapsed = time.time() - start_time
        if elapsed > max_wait_time:
            raise Exception("Report generation timed out after 5 minutes")
            
        print(f"[{datetime.utcnow().isoformat()}] Elapsed: {int(elapsed)}s — Checking report status...")
        
        status_response = make_webex_request('GET', f'https://webexapis.com/v1/reports/{report_id}', headers)
        status = status_response.get('status', 'unknown')
        
        print(f"Report status: {status}")
        
        if status in ["done", "complete"]:
            download_url = status_response.get('downloadUrl')
            if not download_url:
                raise Exception("No download URL provided in completed report")
            break
        elif status in ["failed", "error"]:
            raise Exception("Report generation failed")
        
        time.sleep(5)

    # Step 3: Download CSV
    print(f"Downloading report from: {download_url}")
    download_response = requests.get(download_url, headers=headers, timeout=60)
    download_response.raise_for_status()
    
    csv_content = download_response.text
    lines = csv_content.split('\n')
    lines = [line for line in lines if line.strip()]  # Remove empty lines
    
    print(f"\n=== {len(lines)} CDR lines retrieved ===\n")
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "cdr_imports")
    os.makedirs(output_dir, exist_ok=True)

    # Save CSV file
    filename = f"cdr_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    file_path = os.path.join(output_dir, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(csv_content)

    print(f"CDR report saved to: {file_path}")
    
    # Output JSON result for the backend to parse
    result = {
        "success": True,
        "file_path": file_path,
        "filename": filename,
        "total_lines": len(lines),
        "report_title": f"CDR Report ({days} days)",
        "days_requested": days
    }
    
    print(f"JSON_RESULT: {json.dumps(result)}")

except Exception as e:
    error_result = {
        "success": False,
        "error": str(e),
        "error_type": type(e).__name__
    }
    print(f"JSON_RESULT: {json.dumps(error_result)}")
    exit(1)