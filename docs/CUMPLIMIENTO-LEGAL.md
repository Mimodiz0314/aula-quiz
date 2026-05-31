# Cumplimiento Legal y Privacidad — EduMaster Aula (BORRADORES)

> **Aviso:** estos son **borradores de trabajo** redactados para acelerar la
> revisión legal. NO sustituyen asesoría jurídica. Antes de publicar: validar con
> abogado, **registrar la base de datos ante la SIC** (Colombia) y completar el
> formulario Data Safety de Google Play. (Aborda LEGAL-001.)

---

## 1. Datos personales que trata la app (inventario real, verificado en código)

| Dato | De quién | Dónde | Finalidad |
|---|---|---|---|
| Nombre | **Estudiante (posible menor)** | RTDB `/sesiones`, `/historial` | Identificar al participante en la sesión y en los resultados |
| Curso/grado | Estudiante | RTDB `/sesiones`, `/historial` | Adaptar la actividad y reportar |
| Respuestas / nota | Estudiante | RTDB / IndexedDB local | Evaluación |
| Correo + contraseña | Docente/Admin | Firebase Auth | Cuenta |
| UID anónimo | Estudiante | Firebase Auth | Sesión sin registro |

**Conclusión:** se tratan datos de **menores** → aplica COPPA / Designed for
Families (Play) y, en Colombia, **Ley 1581/Decreto 1377** con régimen reforzado
para menores (el tratamiento debe responder al interés superior del niño y contar
con autorización del representante legal).

---

## 2. Modelo de consentimiento recomendado (a implementar en la app)

El estudiante **no** debe otorgar consentimiento por sí mismo. Modelo propuesto:
1. **El docente/colegio** acepta un acuerdo que declara que cuenta con la
   autorización de los padres/acudientes para usar la herramienta con sus alumnos
   (responsabilidad del establecimiento educativo).
2. **Minimización:** permitir al docente usar **seudónimos o solo el nombre de
   pila** en lugar del nombre completo (reduce exposición de PII de menores).
3. Pantalla de **consentimiento del docente** (checkbox + enlace a esta política)
   antes de crear la primera sala. *(Tarea de UI pendiente — `ConsentGate`.)*

---

## 3. POLÍTICA DE PRIVACIDAD (borrador)

**Responsable:** [Razón social / titular] · **Contacto:** [correo].
**Qué recogemos:** datos de cuenta del docente (correo); datos mínimos de los
estudiantes que el docente introduce o permite (nombre/seudónimo, curso),
respuestas y resultados de las evaluaciones.
**Para qué:** prestar el servicio de evaluación interactiva, calcular resultados y
permitir su reutilización por el docente.
**Base legal / autorización:** autorización del establecimiento educativo y/o del
representante legal del menor (Ley 1581).
**Menores:** la app está diseñada para uso **bajo supervisión docente**; no
dirigimos publicidad a menores ni vendemos sus datos.
**Encargados/terceros:** Google Firebase (autenticación y base de datos),
Vercel (hosting de la API), proveedor(es) de IA [Groq/OpenRouter/OpenAI] solo
para generar contenido a partir del tema del docente (no se envían datos de
menores a la IA).
**Conservación:** los resultados se conservan mientras el docente mantenga su
cuenta; puede eliminarlos desde "Mi Panel".
**Derechos (habeas data):** acceso, rectificación, actualización y supresión
escribiendo a [correo]. **Modo offline:** los datos generados sin internet se
guardan en el dispositivo y se sincronizan cuando hay conexión.
**Cambios:** se publicarán en esta misma página.

> Ya existe la página `/privacidad` (`src/pages/PrivacyPolicy.jsx`): volcar aquí
> el texto final aprobado.

---

## 4. TÉRMINOS DE SERVICIO (borrador, esqueleto)

1. Objeto y descripción del servicio. 2. Cuenta del docente y responsabilidades
(incl. obtener autorizaciones de los acudientes). 3. Uso aceptable (sin contenido
ilícito; el foro/banco comunitario está moderado). 4. Propiedad intelectual del
contenido generado. 5. Limitación de responsabilidad. 6. Disponibilidad y modo
offline. 7. Suspensión por abuso. 8. Ley aplicable (Colombia) y contacto.

---

## 5. HOJA DE RESPUESTAS — Google Play "Data Safety" (borrador)

Para completar en Play Console → *App content → Data safety*:

- **¿Recopila o comparte datos de usuario?** Sí.
- **Tipos de datos:**
  - *Personal info → Name:* recopilado. Propósito: **App functionality**.
    Compartido: No. Obligatorio: el docente puede usar seudónimo.
  - *App activity / Other (respuestas, resultados):* recopilado. Propósito:
    App functionality.
  - *(Docente) Email:* recopilado. Propósito: Account management.
- **¿Cifrado en tránsito?** Sí (HTTPS/TLS con Firebase/Vercel). *Nota: la sesión
  LAN local usa HTTP/WS en claro dentro de la red del aula — declarar este matiz.*
- **¿El usuario puede pedir borrado?** Sí (vía docente / contacto).
- **Audiencia objetivo / Designed for Families:** declarar si se dirige a niños;
  si es así, cumplir requisitos adicionales (SDK certificados, sin anuncios
  inapropiados). **Verificación externa requerida** contra la política vigente.

---

## 6. Checklist de cumplimiento (estado)

- [ ] Política de privacidad publicada y enlazada en la ficha de Play.
- [ ] Términos de servicio publicados.
- [ ] Pantalla de consentimiento del docente in-app (`ConsentGate`).
- [ ] Opción de seudónimo / minimización de nombre.
- [ ] Registro de la base de datos ante la **SIC**.
- [ ] Formulario **Data Safety** completado y coherente con el comportamiento real.
- [ ] Clasificación **IARC** completada.
- [ ] **DPA** de Firebase/Google y del proveedor de IA archivados.
- [ ] Declaración de no envío de PII de menores a la IA (verificado en `api/generar.js`).
