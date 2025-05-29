import subprocess
import time
import os
import sys
from pyngrok import ngrok

def main():
    print("🚀 Starting YOLOv8 Object Detection Server...")
    
    # Set ngrok auth token (you'll need to get this from ngrok.com)
    # ngrok.set_auth_token("your_auth_token_here")  # Uncomment and add your token
    
    try:
        # Check if React build exists
        build_path = "./frontend/build"
        if not os.path.exists(build_path):
            print("📦 React build not found. Building React app...")
            print("Please run: cd frontend && npm run build")
            return
        
        # Start Flask server
        print("🐍 Starting Flask server on port 5000...")
        server_process = subprocess.Popen([
            sys.executable, "./backend/app.py"
        ], cwd=".")
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Create ngrok tunnel
        print("🌐 Creating ngrok tunnel...")
        http_tunnel = ngrok.connect(5000)
        public_url = http_tunnel.public_url
        
        print("\n" + "="*60)
        print("✅ SERVER STARTED SUCCESSFULLY!")
        print("="*60)
        print(f"📱 Mobile Access URL: {public_url}")
        print(f"💻 Local Access URL: http://localhost:5000")
        print("="*60)
        print("📋 Instructions:")
        print("1. Open the Mobile Access URL on your phone")
        print("2. Allow camera permissions when prompted")
        print("3. Use the camera controls to switch between front/rear camera")
        print("4. Objects will be detected automatically every 10 seconds")
        print("5. Press Ctrl+C to stop the server")
        print("="*60)
        
        try:
            # Keep the server running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping server...")
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return
    
    finally:
        # Cleanup
        try:
            server_process.terminate()
            server_process.wait(timeout=5)
        except:
            server_process.kill()
        
        try:
            ngrok.kill()
        except:
            pass
        
        print("✅ Server stopped successfully!")

if __name__ == "__main__":
    main()