# La Marrana — MVP 1

Primera versión funcional de la app **La Marrana**.

## Qué hace

- Registra cuánto dinero tienes
- Guarda la próxima fecha de pago
- Registra pagos que ya tienen dueño
- Apunta gastos
- Calcula:
  - dinero total
  - dinero con dueño
  - dinero libre
  - gasto diario recomendado
  - estado: vas tranquilo, aguas, modo aguante o zona roja
- Evalúa compras con “No te aloques”
- Exporta movimientos en CSV
- Funciona offline después de cargarse una vez

## Cómo usar

1. Sube estos archivos a un repositorio en GitHub.
2. Activa GitHub Pages.
3. Abre el link en Safari desde iPhone.
4. Usa “Agregar a pantalla de inicio”.

## Archivos

- `index.html` — estructura de la app
- `styles.css` — diseño visual
- `app.js` — lógica y cálculos
- `manifest.json` — configuración PWA
- `service-worker.js` — modo offline

## Nota

Esta versión usa `localStorage` para simplificar el MVP. En una siguiente versión se puede migrar a IndexedDB.
