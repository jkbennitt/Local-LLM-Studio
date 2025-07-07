#!/usr/bin/env python3

import websockets
import asyncio
import json

async def test_websocket():
    uri = "ws://localhost:5000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket")
            
            # Send initial message
            await websocket.send(json.dumps({"type": "test", "message": "Hello"}))
            
            # Listen for messages
            async for message in websocket:
                data = json.loads(message)
                print(f"Received: {data}")
                
                if data.get("type") == "heartbeat":
                    # Respond to heartbeat
                    await websocket.send(json.dumps({"type": "heartbeat", "timestamp": data["timestamp"]}))
                    print("Responded to heartbeat")
                
    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())