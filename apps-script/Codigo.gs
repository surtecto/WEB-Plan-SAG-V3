/**
 * PLAN SAG — Receptor del Buzón Ciudadano.
 * 1. Crear una Hoja de cálculo de Google y abrir Extensiones > Apps Script.
 * 2. Pegar este código, guardar y Desplegar > Nueva implementación > Aplicación web
 *    (Ejecutar como: yo · Quién tiene acceso: Cualquier usuario).
 * 3. Copiar la URL /exec en js/config.js → OPINIONES_URL.
 */
function doPost(e) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aportes')
          || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Aportes');
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(['Fecha', 'Nombre', 'Localidad', 'Perfil', 'Senda', 'Mensaje']);
  }
  var p = e.parameter || {};
  if (p.web) { return ContentService.createTextOutput('ok'); } // campo trampa anti-spam
  hoja.appendRow([new Date(), (p.nombre || '').slice(0, 120), (p.localidad || '').slice(0, 80),
                  (p.perfil || '').slice(0, 120), (p.senda || '').slice(0, 60), (p.mensaje || '').slice(0, 2000)]);
  return ContentService.createTextOutput('ok');
}
