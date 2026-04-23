from http.server import BaseHTTPRequestHandler
import json
import time
import os

# Simple file-based storage (works on Vercel's /tmp)
HISTORY_FILE = '/tmp/download_history.json'

def read_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
        return []
    except:
        return []

def write_history(history):
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f)
    except:
        pass

class handler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Get download history"""
        try:
            history = read_history()
            
            # Sort by timestamp, newest first
            history = sorted(history, key=lambda x: x.get('timestamp', 0), reverse=True)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "history": history[:20]
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e)
            }).encode())
    
    def do_POST(self):
        """Save a download to history"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Get existing history
            history = read_history()
            
            # Add timestamp and ID
            data['timestamp'] = int(time.time())
            data['id'] = str(time.time())
            
            # Add to beginning of list
            history.insert(0, data)
            
            # Keep only last 100 downloads
            history = history[:100]
            
            # Save
            write_history(history)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": "Saved to history"
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e)
            }).encode())
