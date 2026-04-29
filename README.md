# La Marrana — v20

App web estática de finanzas simples para usar desde GitHub Pages y guardar en iPhone.

## Qué hace

- Registra ingreso base con “Ya puso”
- Registra ingresos extra con “Me cayó extra”
- Corrige dinero no recibido
- Aparta pagos que ya tienen dueño
- Apunta gastos
- Maneja La Marranita como ahorro manual
- Registra préstamos / lana que anda fuera
- Marca préstamos como pagados
- Evalúa compras con “No te aloques”
- Crea metas de ahorro en “Marranitos en engorda”
- Copia un prompt en Base64 para “Pregúntale al marrano” en ChatGPT
- Exporta movimientos en CSV
- Manda resumen por WhatsApp
- Tiene borrado seguro con presión sostenida
- Funciona offline después de cargarse una vez

## Archivos

- `index.html` — estructura de la app
- `styles.css` — diseño visual
- `app.js` — lógica y cálculos
- `manifest.json` — configuración PWA
- `service-worker.js` — caché/offline
- `apple-touch-icon.png` — ícono iPhone
- `icons/` — íconos PWA

## Nota

La app usa `localStorage`. No requiere cuenta, servidor ni base de datos.
