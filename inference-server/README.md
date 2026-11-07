# Smart Access Edge — servicio de video

Este directorio contiene el servicio Python de Smart Access Edge. Captura video de camaras IP, envia fotogramas a [IA Inference Core](https://github.com/acevallos31/ia-inference-core) para deteccion de objetos, aplica reconocimiento facial y registra/publica eventos.

## Responsabilidades

- **`main.py`**: crea la API y arranca un hilo por camara configurada cuando `ENABLE_CAMERA_WORKERS=true`.
- **`cameras.py`**: configuracion RTSP de `entrada01` y lectura de su secreto local.
- **`camera_worker.py`**: captura con PyAV, codificacion JPEG, consulta HTTP `/detect`, filtrado de personas, reconocimiento facial, snapshots y eventos.
- **`config.py`**: umbrales, rutas, identificador de sitio y estado en memoria.
- **`database.py` / `crud.py`**: conexion SQLAlchemy a PostgreSQL y persistencia.
- **`face_service.py`**: reconocimiento facial local.
- **`event_bus.py`**: publicacion de eventos.

## Flujo y parametros actuales

`RTSP (TCP) -> PyAV -> OpenCV 640x360 -> JPEG -> POST /detect (Coral TPU) -> filtrado de personas -> rostros -> eventos`.

Valores en codigo:
- Clase persona: `0`.
- Confianza minima de persona: `0.75`.
- Caja minima: `40x40` pixeles.
- Deteccion estable: `3` fotogramas consecutivos.
- Enfriamiento de evento: `30` segundos.
- Conexion PyAV: `timeout=(10.0, 15.0)`.
- Peticion HTTP de inferencia: `INFERENCE_TIMEOUT=(2, 8)`.

## Servicios y configuracion del laboratorio

```text
smart-access-edge.service     192.168.1.124:8000
ia-inference-core.service     127.0.0.1:8001
/opt/smart-access-edge        repositorio
/opt/inference-server         ruta de compatibilidad (symlink)
/opt/coral-venv               entorno Python
```

Variables: `ENABLE_CAMERA_WORKERS`, `INFERENCE_API_URL`, `DATABASE_URL`.

La clave RTSP de la camara de laboratorio se lee desde `/root/ezviz-rtsp.secret`; no debe versionarse. `DATABASE_URL` se proporciona desde un archivo de entorno protegido de systemd.

## Validacion

```bash
systemctl is-active smart-access-edge ia-inference-core
curl -fsS http://127.0.0.1:8001/health
curl -fsS http://192.168.1.124:8000/status/entrada01
journalctl -u smart-access-edge -n 30 --no-pager
```

La captura normal fue validada con PyAV 19.0.2, incluyendo incremento del contador `frames`. **Pendiente:** validar reconexion ante corte RTSP, comportamiento con varias camaras, eventos completos en PostgreSQL y proteccion del endpoint publico de snapshots.

Consultar [arquitectura](docs/arquitectura.md), [instalacion](docs/instalacion.md) y [API](docs/api-endpoints.md).
