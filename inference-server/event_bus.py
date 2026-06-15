import asyncio
import json

connected_clients = set()
main_loop = None


def set_loop(loop):
    global main_loop
    main_loop = loop


async def register_client(websocket):
    await websocket.accept()
    connected_clients.add(websocket)


def remove_client(websocket):
    connected_clients.discard(websocket)


async def broadcast_event(event_data):
    disconnected = []

    for client in connected_clients:
        try:
            await client.send_text(json.dumps(event_data))
        except Exception:
            disconnected.append(client)

    for client in disconnected:
        remove_client(client)


def publish_event(event_data):
    if main_loop:
        asyncio.run_coroutine_threadsafe(
            broadcast_event(event_data),
            main_loop
        )
