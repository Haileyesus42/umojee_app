import redis
import sys

def verify_redis():
    url = "redis://localhost:6379/0"
    try:
        # Connect to Redis
        r = redis.from_url(url)
        
        # Ping
        if r.ping():
            print(f"Successfully pinged {url}")
        
        # logical verification (write/read)
        r.set('verification_key', 'success')
        value = r.get('verification_key')
        
        if value == b'success':
            print("Successfully performed SET and GET on DB 0")
            # Cleanup
            r.delete('verification_key')
        else:
            print("Value mismatch on read check")
            sys.exit(1)
            
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_redis()
