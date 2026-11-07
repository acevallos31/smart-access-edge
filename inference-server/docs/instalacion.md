# Instalacion y operacion del servicio de video

Esta guia describe **el despliegue de referencia ya operativo** en Proxmox CT 104. No es un instalador automatizado desde cero: hay componentes nativos, servicios y archivos locales que deben configurarse en cada host.

## Prerrequisitos

- Linux con Python 3.12; despliegue validado en Ubuntu 24.04 LXC.
- OpenCV, PyAV, FastAPI/Uvicorn, requests, SQLAlchemy, PostgreSQL y dependencias de reconocimiento facial en un entorno Python.
- Servicio separado [IA Inference Core](https://github.com/acevallos31/ia-inference-core), con Coral USB TPU y el modelo configurado.
- Acceso de red RTSP a la camara y permisos sobre directorios locales.
- PostgreSQL operativo y esquema compatible con los modelos de la aplicacion.

> El `inference-server/requirements.txt` versionado es un listado historico amplio y no refleja una instalacion limpia validada para esta rama. No ejecutar a ciegas sus versiones en un servidor existente.

## Directorios del laboratorio

```text
/opt/smart-access-edge                codigo fuente
/opt/inference-server                 symlink de compatibilidad
/opt/coral-venv                       entorno Python compartido
/root/ezviz-rtsp.secret               clave RTSP local (privada)
/etc/smart-access-edge/database.env   variables PostgreSQL (privadas)
```

En instalaciones nuevas se recomienda una configuracion propia por entorno y no copiar contrasenas ni endpoints de laboratorio.

## Variables de entorno

```text
DATABASE_URL=...                         requerido: conexion PostgreSQL
INFERENCE_API_URL=http://127.0.0.1:8001/detect
ENABLE_CAMERA_WORKERS=true
```

Proteger archivos secretos con permisos restrictivos y no incluirlos en commits, capturas, informes ni registros. Adaptar la lista de camaras en `cameras.py` y los directorios de `config.py`.

## Servicio y verificacion

El servicio systemd instalado en el laboratorio se llama `smart-access-edge.service`. El motor externo se administra con `ia-inference-core.service`.

```bash
systemctl is-active ia-inference-core smart-access-edge
curl -fsS http://127.0.0.1:8001/health
curl -fsS http://192.168.1.124:8000/status/entrada01
journalctl -u smart-access-edge -n 30 --no-pager
```

El servidor de Smart Access Edge escucha en `192.168.1.124:8000` en el laboratorio, **no necesariamente** en `127.0.0.1:8000`. Confirmar el bind antes de diagnosticar fallos del `curl`.

Para inhabilitar temporalmente las camaras sin detener la API, establecer `ENABLE_CAMERA_WORKERS=false` en el override systemd administrado localmente y reiniciar el servicio de manera controlada. Los cambios de servicio afectan a la captura; programarlos con precaucion.

## Pruebas recomendadas antes de produccion

1. `/health` del motor Coral TPU devuelve estado operativo.
2. `/status/entrada01` muestra `camera_connected=true`, `frames` crecientes y error nulo.
3. Probar desconexion y recuperacion RTSP; revisar `rtsp_timeouts` y `last_error`.
4. Comprobar deteccion de persona, reconocimiento facial y registro del evento en PostgreSQL.
5. Limitar la exposicion de snapshots y revisar permisos, retencion y privacidad.

La integracion PyAV se probo en lectura continua; **la recuperacion frente a caida real de RTSP no esta validada todavia**.
