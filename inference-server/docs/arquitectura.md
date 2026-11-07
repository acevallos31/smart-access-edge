# Arquitectura de inferencia y control de acceso

## Separacion de servicios

Smart Access Edge procesa camaras, identidad y eventos. [IA Inference Core](https://github.com/acevallos31/ia-inference-core) es un proyecto independiente de deteccion de objetos acelerada con Coral USB TPU.

```text
Camara EZVIZ (RTSP autenticado)
          |
          v
Smart Access Edge :8000
  main.py / camera_worker.py
  PyAV + OpenCV (640x360)
          |     JPEG multipart: file
          +---- POST http://127.0.0.1:8001/detect
          |                |
          |                v
          |        IA Inference Core
          |        FastAPI + Coral TPU
          |                |
          +<---- detections, inference_ms
          |
          +---- Filtrado clase persona / umbrales
          +---- Reconocimiento facial
          +---- Snapshots + API
          +---- PostgreSQL / eventos
```

No hay una dependencia de importacion del codigo de IA Inference Core dentro del trabajador; la integracion entre procesos utiliza HTTP local. La gestion del modelo `.tflite` pertenece al repositorio independiente.

## Componentes

- `main.py`: inicia la API y trabajadores en hilos daemon por camara cuando estan habilitados.
- `camera_worker.py`: abre RTSP sobre TCP con `av.open(timeout=(10.0,15.0))`; convierte imagenes, consulta la API y mantiene contadores/estado.
- `cameras.py`: lista de camaras y acceso a secreto local; actualmente contiene una camara de laboratorio.
- `config.py`: umbrales de deteccion y coincidencia facial; directorios de almacenamiento, sitio y URL publica.
- `crud.py` / `database.py`: persistencia mediante SQLAlchemy/PostgreSQL.
- `face_service.py`: reconocimiento de personas registradas.
- `event_bus.py`: notificaciones de eventos.

## Deteccion y resiliencia

Los resultados de `POST /detect` incluyen `class_id`, `score` y `bbox` en coordenadas de la imagen enviada. El trabajador filtra clase `0`, confianza minima `0.75`, dimension de caja y racha de `3` fotogramas; aplica enfriamiento de `30 s` por evento.

La lectura PyAV tiene tiempos de espera de conexion y lectura; el trabajador vuelve a abrir la conexion tras excepciones y marca fin de flujo RTSP. Existe tratamiento especifico de `av.error.TimeoutError`. El campo `rtsp_timeouts` es una estadistica parcial, no un indicador de todos los fallos RTSP.

**Estado de validacion:** captura normal y avance de fotogramas confirmados; pruebas de interrupcion, reconexion y eventos completos pendientes.

## Despliegue del laboratorio

- Proxmox VE, LXC 104, Ubuntu 24.04 / Python 3.12.
- Servicio Smart Access Edge: `192.168.1.124:8000`.
- Servicio IA Inference Core: `127.0.0.1:8001`.
- Python: `/opt/coral-venv`.
- Datos: PostgreSQL, snapshots y archivos locales de eventos.

## Superficie de seguridad

Las credenciales RTSP y PostgreSQL deben permanecer fuera de Git. El dominio del laboratorio publica una URL de snapshot: requerira autorizacion (por ejemplo, Cloudflare Access) y politica de retencion antes de usar datos reales. La inferencia local no sustituye la gestion de privacidad y acceso de la plataforma.
