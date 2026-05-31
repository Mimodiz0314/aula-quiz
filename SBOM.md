# SBOM y Atribuciones de Terceros — EduMaster Aula

> Inventario de dependencias directas y sus licencias (R-2.1 / LEGAL-002).
> Generado a partir de `npm ls --depth=0`. **Verificación externa requerida:**
> ejecutar un escaneo SCA/CVE actualizado (`npm audit`, CycloneDX o Snyk) antes
> del cierre de la transacción, y revisar dependencias transitivas.

## Dependencias de producción (cliente web / PWA)

| Paquete | Versión | Licencia | Notas |
|---|---|---|---|
| react | 18.3.1 | MIT | — |
| react-dom | 18.3.1 | MIT | — |
| react-router-dom | 6.30.3 | MIT | — |
| firebase | 10.14.1 | Apache-2.0 | SDK cliente; claves de config son identificadores públicos, protección vía reglas RTDB |
| qrcode | 1.5.4 | MIT | Generación de QR (unión LAN) |
| docx | 9.7.1 | MIT | Exportación a Word |
| exceljs | 4.4.0 | MIT | Exportación a Excel (chunk pesado, ya lazy-loaded) |
| file-saver | 2.0.5 | MIT | Descarga de archivos |
| @capacitor/core | 7.6.5 | MIT | Runtime nativo |
| @capacitor/android | 7.6.5 | MIT | Plataforma Android |
| @capacitor/app | 7.1.2 | MIT | Eventos de app (botón atrás) |

## Dependencia nativa (APK Android — `android/app/build.gradle`)

| Paquete | Versión | Licencia | Notas |
|---|---|---|---|
| org.nanohttpd:nanohttpd-websocket | 2.3.1 | BSD-3-Clause | Servidor HTTP+WebSocket embebido del host LAN |

## Dependencias de desarrollo (no se distribuyen)

| Paquete | Versión | Licencia |
|---|---|---|
| vite | 5.4.21 | MIT |
| @vitejs/plugin-react | 4.7.0 | MIT |
| vite-plugin-pwa | 1.3.0 | MIT |
| vitest | 4.1.7 | MIT |
| tailwindcss | 3.4.19 | MIT |
| postcss | 8.5.15 | MIT |
| autoprefixer | 10.5.0 | MIT |
| @capacitor/cli | 7.6.5 | MIT |
| @types/react, @types/react-dom | 18.3.x | MIT |

## Backend serverless (`functions/package.json`)

| Paquete | Versión | Licencia | Notas |
|---|---|---|---|
| firebase-admin | ^11.8.0 | Apache-2.0 | ⚠️ Runtime Node 18 (EOL) — migrar (DEVOPS-001) |
| firebase-functions | ^4.3.1 | MIT | — |
| openai | ^4.40.0 | Apache-2.0 | — |
| @anthropic-ai/sdk | ^0.20.1 | MIT | — |
| cors | ^2.8.5 | MIT | — |

## Conclusión de licencias

- **No se detectan licencias copyleft virales (GPL/AGPL/LGPL)** en dependencias
  directas. Predominan MIT, Apache-2.0 y BSD-3-Clause (todas permisivas,
  compatibles con distribución comercial / venta del activo).
- **Obligación pendiente:** incluir avisos de atribución (texto de licencia MIT/
  BSD/Apache) en una pantalla "Acerca de / Licencias" dentro de la app.
- **Verificación externa requerida:** escaneo de CVEs y de dependencias
  transitivas (este SBOM cubre solo dependencias directas).

## Chain of title (titularidad)
Pendiente de declaración firmada del titular: confirmar que el 100% del código
propietario fue desarrollado por/para el titular y que ninguna porción incorpora
código de terceros bajo licencias incompatibles con la cesión total de IP.
