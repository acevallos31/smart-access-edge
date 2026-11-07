# Smart Access Edge

Plataforma de control de acceso, asistencia y analitica de video con camaras IP, deteccion de personas y reconocimiento facial. El proyecto se encuentra en desarrollo y combina una aplicacion web, una API de negocio y un servicio de procesamiento de video en el borde (*edge*).

> **Estado de la integracion (noviembre de 2026):** la rama `feat/edge-inference-integration` utiliza PyAV para recibir video RTSP y consulta un motor Coral TPU externo mediante HTTP. La captura normal se verifico con la camara de prueba `entrada01`; las pruebas de reconexion ante fallos reales y la validacion integral de asistencia siguen pendientes.

## Componentes

| Componente | Tecnologia | Responsabilidad |
|---|---|---|
| `frontend/` | Angular | Interfaz de administracion (en desarrollo) |
| `backend/` | .NET / C# | API de negocio e integracion con Firebase (en desarrollo) |
| `inference-server/` | Python, FastAPI, PyAV, OpenCV | Captura de camaras, deteccion, rostros, estados, snapshots y eventos |
| [IA Inference Core](https://github.com/acevallos31/ia-inference-core) | Python, FastAPI, Coral USB TPU | Servicio **independiente** de inferencia de objetos |

## Flujo de procesamiento

```text
Camara IP (RTSP)
       |
       v
Smart Access Edge / camera_worker.py
  - PyAV (RTSP/TCP, timeout, reconexion)
  - Escalado a 640x360
       |
       +---- JPEG via POST /detect ----> IA Inference Core :8001
       |                                    Coral TPU
       |<--- cajas, clase y confianza ----+
       |
       +---- Reconocimiento facial (local)
       +---- Publicacion de eventos
       +---- PostgreSQL
       +---- Snapshots / API de consulta
```

El procesador RTSP y el motor Coral TPU son **dos servicios separados**. Smart Access Edge no necesita cargar localmente el modelo de deteccion de personas para consultar `/detect`.

## Despliegue de referencia probado

- **Plataforma:** Proxmox VE, contenedor LXC 104 (`ia-inference-core`).
- **Sistema invitado:** Ubuntu 24.04, Python 3.12.
- **Smart Access Edge:** servicio `smart-access-edge.service`, interfaz `192.168.1.124:8000` en el laboratorio.
- **IA Inference Core:** servicio `ia-inference-core.service`, `127.0.0.1:8001` (acceso local).
- **Entorno Python operativo:** `/opt/coral-venv`.
- **Directorio del codigo:** `/opt/smart-access-edge`; ruta de compatibilidad `/opt/inference-server`.
- **Camaras de prueba:** `entrada01`, flujo RTSP autenticado.
- **Almacenamiento de eventos:** PostgreSQL.

Las IP, dominios y rutas anteriores describen el laboratorio actual; **no son valores universales de instalacion**.

## Configuracion del trabajador de camara

Variables utilizadas en la implementacion:

| Variable | Descripcion |
|---|---|
| `ENABLE_CAMERA_WORKERS` | `true` para iniciar los hilos de camara; `false` para ejecutar solo la API |
| `INFERENCE_API_URL` | URL del endpoint Coral TPU; por defecto `http://127.0.0.1:8001/detect` |
| `DATABASE_URL` | Cadena SQLAlchemy de conexion a PostgreSQL, obligatoria |

En el laboratorio, la credencial de la camara se lee desde `/root/ezviz-rtsp.secret` (archivo local, **no versionado**), y el servicio carga las variables de base de datos mediante configuracion protegida de systemd.

Los valores de umbral, racha de deteccion, directorios y URL publica de snapshots se encuentran actualmente en `inference-server/config.py`. Antes de instalar en otra infraestructura, adaptar tambien `inference-server/cameras.py` y los archivos de configuracion locales.

## Comprobaciones operativas

```bash
systemctl is-active ia-inference-core smart-access-edge
curl -fsS http://127.0.0.1:8001/health
curl -fsS http://192.168.1.124:8000/status/entrada01
journalctl -u smart-access-edge -n 30 --no-pager
```

El estado de camara incluye `camera_connected`, `frames`, `last_error`, `rtsp_timeouts` y `last_snapshot`. Una respuesta `camera_connected: true` no demuestra por si sola que la deteccion facial o el almacenamiento de eventos se hayan validado de extremo a extremo.

## Documentacion

- [Arquitectura del servicio de video](inference-server/docs/arquitectura.md)
- [Instalacion y despliegue](inference-server/docs/instalacion.md)
- [API y endpoints](inference-server/docs/api-endpoints.md)
- [Servidor de video](inference-server/README.md)
- [Repositorio de IA Inference Core](https://github.com/acevallos31/ia-inference-core)

## Seguridad y limitaciones

- No subir contrasenas RTSP, `DATABASE_URL`, secretos Firebase, snapshots personales ni modelos de rostros.
- El endpoint de snapshots del laboratorio usa un dominio externo; **restringir el acceso** antes de usar imagenes o datos biometricos reales.
- La configuracion operativa de PyAV utiliza `timeout=(10.0, 15.0)` y reconexion. La prueba de captura continua fue exitosa, pero aun falta una prueba controlada de interrupcion y recuperacion RTSP.
- El repositorio `inference-server/requirements.txt` contiene dependencias historicas heterogeneas; no debe considerarse un procedimiento reproducible de instalacion de cero sin depuracion y pruebas adicionales.
- El sistema no debe considerarse una solucion biometrica de produccion sin evaluaciones de exactitud, consentimiento, controles de acceso, retencion y auditoria.
