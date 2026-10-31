# Crecimiento urbano · San Andrés de Giles

**Mancha y Copa**

SIG temporal de la ampliación urbana, la densidad edificada y el arbolado de la cabecera (1874–2026).
Plan de Ordenamiento Territorial · Arq. Juan Patricio Addesso, Asesor del Consejo Municipal para el Desarrollo y el Ordenamiento Territorial (CMDOT).

**Ver en línea:** https://surtecto.github.io/WEB-Plan-SAG-V3/crecimiento-urbano/

`index.html` es autosuficiente: trae los datos embebidos, incluida la mancha satelital ya clasificada, y carga Leaflet (cdnjs), geotiff.js (jsDelivr, sólo para el módulo de copa) y las fuentes (Google Fonts). También funciona descargándolo y abriéndolo en un navegador de escritorio.

## Qué muestra
- **Alta resolución 2025**: mancha urbana con el criterio de Humacata y Di Paolo (2024): manzanas con construcciones conectadas por calles, área compacta (510 ha) y áreas residenciales extraurbanas (85 ha, 25 agrupamientos). 18.569 edificaciones detectadas por Google (Open Buildings v3). Cada parcela con su densidad (FOS aparente), su ocupación (construcción de 25 m² o más) y sus señales de vida (sin construcción, incipiente, habitada, arraigada, compacta). Piletas, copa en la calle y copa en el interior sobre la imagen Vantor del 26/01/2025 (0,34 m).
- **Mancha satelital 1976–2026**: clasificación propia de 150 escenas Landsat (Esri Landsat/MS, NDVI) en 18 épocas: 1976–1980, 1987, 1999–2000, 2005–2006, 2011 y cada año de 2013 a 2025–2026. Polígonos por densidad aparente (alta, media, baja), anillos de crecimiento y envolvente compacta. La regla de abajo elige la época; el panel muestra superficie, escenas, serie y ocupación por clase de parcelamiento.
- **Cartografía histórica**: registro gráfico c. 1874 y planta urbana de 1884 con su cerramiento por parcela.
- **Censos 1991–2022**: viviendas y habitantes por hectárea de tejido parcelado, por radio.
- **Copa** (se calcula al abrir, sobre la vista elegida): clasificación de las imágenes Esri Wayback 2014–2026 en copa, pasto, construido y sombra; copa en la vía pública y en el interior de manzana.

## Método de alta resolución
Huellas de Google Open Buildings v3 (celda S2 95bb, confianza ≥ 0,70); galpones = más de 600 m² o alargados. Imagen Esri World Imagery (Vantor Legion, 26/01/2025, 0,34 m) clasificada en 2.075 teselas z18 (0,49 m) en techo (huellas de Google), árbol, pasto, suelo sin verde, pileta y sombra; cada píxel asignado a su parcela o al frente de vía pública de su manzana. Límites: manzana urbana si tiene al menos una vivienda (40 a 600 m²) y un cuarto de sus lotes construidos; unión por calles de hasta 70 m y relleno de vacíos internos; compacta = área continua con la plaza y lo contiguo de lote tradicional; extraurbana = agrupamientos de 8 o más viviendas (vecinas a menos de 70 m) separados, a menos de 3,5 km de la plaza. Validación: parcelas con construcción vs. viviendas del censo 2022 por radio, correlación 0,92.

Nota: las 632 ha compactas y 1.325 ha totales del Cuadro 2 de Humacata y Di Paolo son del partido entero. Para la cabecera ellos dan 351 ha (1990) y 517 ha (2020 = 451 compactas + 66 extraurbanas).

## Método de la mancha Landsat
NDVI máximo por época; media 3×3; umbral por época a mitad de camino entre la mediana del casco histórico y la del campo; mayoría espacial 5 de 9 y, en Landsat 8–9, mayoría temporal 2 de 3 años; persistencia hacia atrás (urbano en t sólo si urbano en t+1); componentes conectados al tejido catastral; se quitan rutas fuera del tejido y manchas menores de 0,36 ha. Densidad aparente f = (NDVI rural − NDVI píxel) / (NDVI rural − NDVI casco denso): baja < 0,45 ≤ media < 0,70 ≤ alta. Grilla de 30 m (EPSG:3857), polígonos suavizados.

Límites: la escena de 1976 ve sólo el 62 % del casco (este); 1976–1980 combina 1976 y 1980. MSS a 60 m. Las épocas 1987–2011 tienen 2 escenas y las de 2013 en adelante 10 o 20: puede haber un escalón entre 2011 y 2013. La última época tiene menos confirmación posterior. No es un FOS medido.

## Datos (carpeta `datos`)
- `mancha_y_copa_SAG.gpkg` (POSGAR 2007 faja 5, EPSG:5347), 16 capas: manzanas_2024 (con indicadores de alta resolución), parcelas_2024_partidas, parcelas_alta_resolucion_2025, edificios_google_open_buildings, mancha_hdp_2025, mancha_manzanas_landsat_por_epoca, piletas_2025, planta_urbana_1884, registro_grafico_1874, radios_censales_cabecera, via_publica, frentes_por_manzana, mancha_densidad_por_epoca, mancha_total_por_epoca, mancha_anillos_ingreso, mancha_envolvente_compacta.
- `alta_resolucion_estadisticas.json`: cifras de alta resolución por clase de loteo, mancha y validación censal.
- Las mismas capas en GeoJSON (WGS84).
- `mancha_estadisticas_1976-2026.csv`: superficie por época y densidad, envolvente y escenas.

### Campos de manzanas
`periodo` P1 registro inicial (partida mínima ≤ 3.450) · P2 posterior · P3 desde 2009 aprox. (≥ 12.344, supuesto a calibrar con convenios) · `pmin/pmed/pmax` partidas · `lot_m2` lote medio · `cloaca`, `agua` proporción de parcelas con red · `in84` fracción dentro de la planta de 1884 · `p84_*` fracción por cerramiento en 1884 · `viv1991…viv2022` viviendas por ha de tejido 2024 del radio · `hab1991…hab2022` habitantes por ha de tejido · `sat_anio` primera época en que la manzana supera el 50 % de ocupación satelital · `sat_ocup` % de la manzana cubierto por la mancha en 2025–2026 · `sat_dens` clase media de densidad de lo ocupado en 2025–2026 (1 baja, 2 media, 3 alta) · `ocup_1980`, `ocup_2011` % cubierto en 1976–1980 y en 2011.

### Campos de parcelas de alta resolución
`edif_n` edificaciones · `techo_m2` · `edif_max_m2` · `fos` techo/lote · `copa_libre`, `pasto_libre`, `sinverde_libre` fracción del lote libre · `pileta` (0/1) y `pileta_m2` · `copa_m2` · `vida` 0–4 y `vida_txt` · `clase` A traza antigua, B quinta, C loteo hasta 2009, D loteo desde 2009 · `manzana`.

Manzanas suman `fos`, `ocup_lotes`, `edif_ha`, `copa_int`, `copa_calle`, `vida_hab`, `piletas`, `urb` (urbana según el criterio), `n_viv`.

### Campos de la mancha
`anio` año clave de la época · `epoca` rótulo · `sensor` · `escenas` cantidad · `fechas` fechas de las escenas · `densidad`/`clase` (capa por densidad) · `orden` (anillos) · `ha` superficie.

## Informe
`informe/Mancha_y_Copa_Informe_SAG_2026-10.docx`: informe técnico (octubre 2026) con el método, la serie satelital, las lecturas y las preguntas que abre.

## Fuentes
Google Open Buildings v3 (CC BY 4.0 / ODbL) · Esri World Imagery (Vantor, 26/01/2025) · Humacata y Di Paolo (2024), Locale 9 · Atlas de Mensuras de Giles (AHG) · INDEC (procesamiento CMDOT) · Parcelario COU 2024 · USGS/NASA Landsat vía Esri (Landsat/MS) · Esri World Imagery y Wayback · EOX Sentinel-2 cloudless (CC BY 4.0 2016–2017; CC BY-NC-SA 4.0 desde 2018) · DLR WSF Evolution (CC BY 4.0) · ESA WorldCover 2021 (CC BY 4.0).
