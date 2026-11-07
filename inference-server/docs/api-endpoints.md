# API y contrato de integracion

## Smart Access Edge (puerto 8000 en el laboratorio)

### `GET /status/{camera_id}`

Estado del trabajador de una camara. Ejemplo de estructura, con valores **ilustrativos**:

```json
{
  "camera_id": "entrada01",
  "camera_name": "Entrada Principal",
  "camera_connected": true,
  "frames": 587,
  "persons": 0,
  "stable_detection": false,
  "detection_counter": 0,
  "last_error": null,
  "last_snapshot": "https://inference-api.nocpbx.com/snapshot/entrada01",
  "last_event": null,
  "rtsp_timeouts": 0,
  "last_frame_time": 1794035631.896
}
```

La ruta y estructura se comprobaron con el servidor de laboratorio. Los contadores son por proceso y pueden reiniciarse cuando se reinicia el servicio.

### `GET /snapshot/{camera_id}`

Ruta utilizada por el trabajador para generar URL de la ultima captura JPEG. Confirmar controles de acceso antes de publicar imagenes; el dominio de laboratorio requiere proteccion de acceso.

El servidor contiene otras rutas; este documento describe solo las integraciones verificadas en el trabajo actual y no constituye un inventario exhaustivo.

## IA Inference Core (puerto 8001, servicio independiente)

Repositorio: https://github.com/acevallos31/ia-inference-core

### `GET /health`

Respuesta comprobada:

```json
{"status": "ok", "engine": "coral_tpu"}
```

### `POST /detect`

- **Tipo:** `multipart/form-data`
- **Campo:** `file` (archivo de imagen)
- **Formato probado:** JPEG
- **Respuesta:** dimensiones originales, `inference_ms` y arreglo `detections`.
- **Umbral dentro del motor:** `0.5`; Smart Access Edge aplica despues su filtro de persona `0.75`.

Ejemplo **ilustrativo**, no una medicion:

```json
{
  "inference_ms": 12.5,
  "image_width": 640,
  "image_height": 360,
  "detections": [
    {
      "class_id": 0,
      "score": 0.95,
      "bbox": {"xmin": 120, "ymin": 40, "xmax": 280, "ymax": 340}
    }
  ]
}
```

Ejemplo de llamada desde el propio CT 104 (sustituir `/ruta/imagen.jpg`):

```bash
curl -sS -F "file=@/ruta/imagen.jpg" http://127.0.0.1:8001/detect
```

Errores previstos por el codigo del motor: `400` para imagen vacia/invalida y `503` si el motor no esta disponible. La API Coral TPU no implementa autenticacion propia y solo debe escucharse en una interfaz interna.

## Integracion HTTP desde el trabajador

`camera_worker.py` utiliza `INFERENCE_API_URL` (valor predeterminado `http://127.0.0.1:8001/detect`) y un timeout HTTP `(2, 8)`. No confundir el timeout HTTP con el timeout RTSP de PyAV `(10, 15)`.
