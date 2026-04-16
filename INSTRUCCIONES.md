# 📋 GUÍA DE INSTALACIÓN — FarmaciaFlow
## Sigue estos pasos en orden. No hace falta saber programar.

---

## PASO 1 — Crear la base de datos (Firebase) 🔥

1. Ve a https://console.firebase.google.com
2. Inicia sesión con una cuenta de Google (crea una si no tienes)
3. Haz clic en **"Crear un proyecto"**
4. Ponle nombre: `farmaciaflow` → Continuar → Continuar → Crear proyecto
5. Una vez dentro, haz clic en **"Firestore Database"** (menú izquierdo)
6. Haz clic en **"Crear base de datos"**
7. Selecciona **"Comenzar en modo de prueba"** → Siguiente → Habilitar
8. Ahora ve a ⚙️ **Configuración del proyecto** (engranaje arriba a la izquierda)
9. Baja hasta **"Tus aplicaciones"** → haz clic en el icono **</>** (Web)
10. Ponle un nombre: `farmaciaflow-web` → Registrar app
11. Verás un bloque de código con `firebaseConfig`. **Copia esos valores** (apiKey, authDomain, etc.)
12. Abre el archivo `src/firebase.js` y pega cada valor donde dice `PEGA_AQUI_TU_...`

---

## PASO 2 — Instalar Node.js 🟢

1. Ve a https://nodejs.org
2. Descarga la versión **LTS** (la recomendada)
3. Instálala con todas las opciones por defecto

---

## PASO 3 — Subir el código a GitHub 🐙

1. Ve a https://github.com y crea una cuenta gratuita
2. Haz clic en **"New repository"**
3. Nómbralo `farmaciaflow` → **Create repository**
4. En tu ordenador, abre la carpeta `farmaciaflow` que te hemos dado
5. Abre una terminal en esa carpeta (en Windows: clic derecho → "Abrir en Terminal")
6. Escribe estos comandos uno a uno:
   ```
   npm install
   git init
   git add .
   git commit -m "primera version"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/farmaciaflow.git
   git push -u origin main
   ```
   (Sustituye TU_USUARIO por tu nombre de usuario de GitHub)

---

## PASO 4 — Publicar la app (Vercel) 🚀

1. Ve a https://vercel.com
2. Haz clic en **"Sign up"** → Continúa con GitHub
3. Una vez dentro, haz clic en **"Add New Project"**
4. Selecciona el repositorio `farmaciaflow`
5. Haz clic en **"Deploy"** → espera 1-2 minutos
6. ¡Listo! Vercel te dará una URL del tipo: `farmaciaflow.vercel.app`

---

## PASO 5 — Compartir con el equipo 📱

1. Copia la URL que te da Vercel
2. Compártela por WhatsApp con todo el equipo
3. Cada persona puede guardarla en su móvil como acceso directo:
   - **iPhone**: Abrir Safari → Compartir → "Añadir a pantalla de inicio"
   - **Android**: Abrir Chrome → Menú (tres puntos) → "Añadir a pantalla de inicio"

---

## ✅ ¿Cómo funciona el guardado?

- Cada día tiene su propia jornada. Pulsa **"Guardar jornada"** para que los datos queden guardados.
- Todo el equipo ve los mismos datos en tiempo real.
- El historial guarda todas las jornadas anteriores.
- Los datos están seguros en Firebase (servidores de Google).

---

## 🆘 ¿Algo no funciona?

Vuelve a Claude y dile exactamente qué mensaje de error ves.
