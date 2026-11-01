# Crecimiento urbano · San Andrés de Giles

**Poblamiento y Vegetación**

SIG temporal de la ampliación urbana, la densidad edificada y el arbolado de la cabecera (1874–2026).
Plan de Ordenamiento Territorial · Arq. Juan Patricio Addesso, Asesor del Consejo Municipal para el Desarrollo y el Ordenamiento Territorial (CMDOT).

**Ver en línea:** https://surtecto.github.io/WEB-Plan-SAG-V3/crecimiento-urbano/

`index.html` es autosuficiente: trae los datos embebidos, incluida el poblamiento satelital ya clasificada, y carga Leaflet (cdnjs), geotiff.js (jsDelivr, sólo para el módulo de vegetación) y las fuentes (Google Fonts). También funciona descargándolo y abriéndolo en un navegador de escritorio.


## Estructura (desde el 31/10/2026): el Partido en diez territorios
- `index.html` · portada del Partido: mapa de los nueve Pagos y la Ciudad (límites del SIG municipal, capa Pagos_SAG), una tarjeta por territorio y la comparación en números.
- `ciudad/` · la cabecera, delimitada por el hueco que dejan los Pagos (3.266 ha). Conserva toda la lectura anterior: serie Landsat 1976–2026, alta resolución 2025 lote por lote, comparaciones y vegetación. En Superficies se agrega el ámbito «Ciudad (límite del Plan)».
- `pagos/<pago>/` · una página por Pago con la misma web: regla de épocas, capas con encendido y opacidad, análisis de vegetación en vivo, comparación de fechas y exportación. Suma los pueblos y parajes (zona R7 del COU 2024 y sus zonas complementarias), el parcelario rural por tamaño, el censo 2022 por radio, las actividades intensivas 2021, la red vial 2017, la zonificación, las mensuras del siglo XIX y las estancias y puestos de 1884, y el uso agrícola del verano 2020/21 (INTA).
- `datos/pagos_SAG_territorios.gpkg` (POSGAR 2007 faja 5) · territorios con sus cifras, áreas de pueblos estudiadas, radios del censo 2022, actividades intensivas 2021, estancias y puestos 1884 y, desde el 01/11/2026: `edificios_open_buildings_v3` (33.067 edificaciones del Partido con tipo, Pago, pueblo y Ciudad), `agrupamientos_rurales` (1.640: casa aislada, casco o puesto, agrupamiento, núcleo productivo), `pueblos_poblamiento_densidad_por_epoca`, `pueblos_anillos_crecimiento`, `pueblos_envolvente_compacta_por_epoca`, `pueblos_poblamiento_2025`, `pueblos_parcelas_alta_resolucion_2025` (FOS, vegetación del lote, señales de vida), `manzanas_pueblos` (con `fos`, `ocup_lotes`, `vida_hab`, `edif_ha`, `copa_int`, `copa_calle`, `sat_anio`, `sat_ocup`), `pueblos_piletas_2025` y `vegetacion_forestal_rural` (celdas de ≈13 m con árboles). `datos/pagos_SAG.geojson`: límites de los Pagos y la Ciudad.

### Pagos: qué se agregó el 01/11/2026
- **Cómo se mira**: arriba de la pestaña Crecimiento de cada Pago, botones que prenden sólo las capas de cada pregunta, encuadran el mapa y explican los colores: crecimiento de los pueblos por época, anillos de crecimiento, año de ocupación por manzana, poblamiento 2025 y techos, lotes por señales de vida, edificación rural, vegetación en los pueblos, vegetación forestal del campo y coberturas MapBiomas. Un selector lleva a cada pueblo.
- **Crecimiento de los pueblos 1976–2026** (Azcuénaga, Cucullú, Solís, San Alberto, Tuyutí, Villa Espil y Villa Ruiz): la huella 2025 sale de las edificaciones de Google (celdas de 30 m con techo cerca); Landsat (NDVI máximo por época) fecha cuándo cada celda empezó a comportarse como construida, con persistencia en 6 de cada 10 épocas siguientes. Las celdas que no se pueden fechar (lotes muy arbolados) toman la época de la celda fechada más cercana a menos de 90 m. Antes de la primera época fechable de cada pueblo no se dibuja nada. Franklin queda sin dato: cae en la celda 95bd de Open Buildings, no procesada.
- **Alta resolución 2025 en los pueblos**: área compacta y extraurbana, lotes construidos, FOS, señales de vida, piletas, vegetación en la calle y en el interior (Esri World Imagery, nivel 18).
- **Edificación rural**: edificaciones de Google fuera de la Ciudad y agrupamientos a menos de 80 m.
- **Vegetación forestal** (montes, cortinas, arboledas, árboles sueltos) y **coberturas MapBiomas Argentina 2019–2024** (colección 2, 30 m).
- **Analizar una imagen** (crecimiento y vegetación en vivo, imágenes Wayback 2014–2026): pestaña Vegetación, arriba; botón de acceso en Crecimiento.

## Recorte y procedencia (desde el 01/11/2026)
- **Recorte estricto con la capa Pagos_SAG.** Cada página muestra y cuenta sólo lo que cae dentro de su polígono. Entidades (parcelas, manzanas, frentes, edificaciones, piletas, actividades, estancias): se cuentan si su punto interior cae adentro y se dibujan recortadas. Superficies (Landsat, poblamiento, vegetación, MapBiomas, radios, zonas, mensuras, registro 1874): se recortan con el límite. Las cifras se recalcularon con lo que queda adentro. La página de la Ciudad dejó afuera 144 parcelas, 12 manzanas, 2.234 edificaciones y 7 piletas del estudio anterior de la cabecera, que excedía el límite, y sumó 134 parcelas del parcelario (1.478 ha, casi todas rurales y complementarias) que están dentro de la Ciudad y el estudio anterior no cubría (sin análisis de alta resolución). Las superficies Landsat se miden sobre la unión de los polígonos (sin contar dos veces sus bordes superpuestos): 499,3 ha en 2025–2026.
- **Pueblos partidos por un límite.** Un pueblo cuya área cruza el límite se estudia en cada Pago sólo en la parte que le toca (por ejemplo, Azcuénaga: Campo y Ciudad y Cañada de la Cruz). Su serie Landsat se calcula una vez sobre el área completa y se recorta por Pago.
- **Huecos de la capa Pagos_SAG.** 591 ha con 233 parcelas y unas 535 personas no caen en ningún Pago: las franjas de las vías férreas (40 a 90 m) y parte de las zonas urbanas de Azcuénaga, Villa Espil y San Alberto. No se suman a ningún Pago; la portada los muestra en rojo (capa «Suelo sin Pago»). La capa también superpone Pagos en unas 58 ha (la mayor, 35,5 ha entre Cañada de Giles y de a Caballo): lo que cae allí aparece en las dos páginas, y cada página lo advierte.
- **Procedencia de cada dato.** Cada capa dice debajo de su nombre de qué producto, imagen y fecha sale; la pestaña Datos tiene la ficha técnica completa. Las edificaciones son de Google Open Buildings v3 (imágenes de 50 cm anteriores a mayo de 2023; Google no publica la fecha de cada toma), con confianza ≥ 0,70 en todo el Partido (en los Pagos el valor se guardó con dos decimales, por lo que entran también 0,695 a 0,699). La vegetación, las piletas y las señales de vida se midieron sobre Esri World Imagery, versión Wayback 29/10/2026 (n.º 43291): en la Ciudad, la toma Vantor Legion del 26/01/2025 (0,34 m); en los Pagos, la toma que corresponda a cada sector, que se consulta con la capa «Fechas de toma» y la tabla de la ficha técnica.
- **Fondo congruente.** El fondo por defecto es esa misma versión de Esri («Imagen de las detecciones»). La leyenda dice cuál es el fondo y avisa cuando una capa encendida es de otra imagen u otra fecha, con un botón para poner la que corresponde (Landsat de la misma época, Wayback 29/10/2026 o Wayback 03/05/2023 para las huellas de Google).
- **Crecimiento de los pueblos 1976–2023.** La serie termina en 2023 porque la huella de Google es anterior a mayo de 2023: lo construido después no tiene huella. La cabecera conserva su clasificación directa 1976–2026 (150 escenas Landsat, 18 épocas).

## Panel contextual «En el mapa ahora» (desde el 01/11/2026)
- Arriba del panel derecho de cada Pago y de la Ciudad: la imagen de fondo exacta, los avisos de congruencia y las capas encendidas de arriba hacia abajo, cada una con su imagen, fecha y fuente según el estado actual (época de la regla, año de MapBiomas, imagen y toma de la clasificación en vivo).
- Las lecturas del panel se muestran sólo si su capa está encendida (pueblos, poblamiento rural, comparación, superficies, alta resolución, serie Landsat, tema de manzanas). El resumen general del territorio y lo pendiente quedan plegados al final.
- La leyenda de la clasificación dice de qué imagen es; el panel Capas muestra la procedencia actualizada de cada capa; Exportar muestra lo que va a salir y la hoja 2 del PDF lista la imagen de fondo y la procedencia de cada capa.
- El cambio está en el código del SIG de las 10 páginas. Si las páginas se regeneran, volver a aplicar `_parches/panel_contextual.py` (reemplazos verificados, sale con error si alguna ancla cambió).

## Detección multisensor (desde el 01/11/2026)
`multisensor.js`, cargado en la Ciudad y los nueve Pagos (pestaña Vegetación, con acceso desde Crecimiento). Usa todas las imágenes de la regla para medir, no sólo para mirar.
- **Fuentes**: Landsat 2, 3, 5, 7, 8 y 9 (servicio Esri Landsat/MS: escenas de 1976, 1980, 1987, 1999–2000, 2005–2006, 2011 y de cada año desde 2013, elegidas por nombre) y Sentinel-2 L2A 2017–2026 (Element 84 Earth Search, COG en AWS, máscara de nubes SCL). Se leen las bandas verde, roja, infrarrojo cercano e infrarrojo de onda corta.
- **Fechas**: una escena por estación (la de menos nubes), así cada píxel tiene su trayectoria del año: NDVI medio, mínimo y máximo, NDBI y MNDWI.
- **Construido**: un modelo calibrado con las huellas de Google Open Buildings (≤ mayo 2023) y las imágenes de 2023 del mismo sensor estima la fracción de techo en celdas de ≈55–60 m (denso ≥ 20 %, medio 10–20 %, disperso desde el umbral, 5 % por defecto). Los períodos de una o dos fechas se calibran con 2023 en los mismos meses. Cada resultado informa R², error medio, sensibilidad y precisión del modelo.
- **Vegetación**: verde todo el año (NDVI mínimo ≥ 0,55), cultivos y pasturas (verdes por temporada), suelo con poca vegetación; agua por MNDWI.
- **Ámbitos**: pueblos y parajes estudiados, todo el Pago o la Ciudad, vista del mapa. **Serie** completa con gráfico y CSV; **ampliación** entre dos períodos (construido nuevo, perdido, vegetación permanente ganada y perdida).
- **Límites medidos**: en la Ciudad (Sentinel-2 2024, 10 m) el modelo explica el 60 % de la variación del techo; en pueblos chicos con mucho arbolado (Azcuénaga, Villa Ruiz) apenas el 26 %: allí la casa entre árboles no se distingue a 10–30 m y la lectura de detalle sigue siendo la de Google y Esri.
- Ganchos en el SIG: `_parches/multisensor_gancho.py` (expone el mapa y el repintado del panel «En el mapa ahora»).

## Qué muestra
- **Alta resolución 2025**: poblamiento urbano con el criterio de manzanas con construcciones conectadas por calles (referencia en Fuentes): área compacta (510 ha) y áreas residenciales extraurbanas (85 ha, 25 agrupamientos). 18.569 edificaciones detectadas por Google (Open Buildings v3). Cada parcela con su densidad (FOS aparente), su ocupación (construcción de 25 m² o más) y sus señales de vida (sin construcción, incipiente, habitada, arraigada, compacta). Piletas, vegetación en la calle y vegetación en el interior sobre la imagen Vantor del 26/01/2025 (0,34 m).
- **Poblamiento satelital 1976–2026**: clasificación propia de 150 escenas Landsat (Esri Landsat/MS, NDVI) en 18 épocas: 1976–1980, 1987, 1999–2000, 2005–2006, 2011 y cada año de 2013 a 2025–2026. Polígonos por densidad aparente (alta, media, baja), anillos de crecimiento y envolvente compacta. La regla de abajo elige la época; el panel muestra superficie, escenas, serie y ocupación por clase de parcelamiento.
- **Cartografía histórica**: registro gráfico c. 1874 y planta urbana de 1884 con su cerramiento por parcela.
- **Censos 1991–2022**: viviendas y habitantes por hectárea de tejido parcelado, por radio.
- **Vegetación** (se calcula al abrir, sobre la vista elegida): clasificación de las imágenes Esri Wayback 2014–2026 en vegetación, pasto, construido y sombra; vegetación en la vía pública y en el interior de manzana.

## Uso
- **Capas**: panel flotante arriba a la derecha, agrupado por fuente; casilla y opacidad por capa; etiqueta de origen (**fijo** = precalculado, en la web y en el GeoPackage; **en línea** = imagen que se descarga al mirarla, no se guarda; **en vivo** = calculado en el navegador). **Orden de dibujo**: sube o baja las capas encendidas.
- **Comparar dos años** (pestaña Crecimiento): poblamiento, densidad, suelo nuevo, densificación, hacia dónde creció (rumbo y distancia a la plaza), ocupación por clase de loteo, población de los censos cercanos; en el mapa, lo que ya estaba y lo que se suma, y el cambio por manzana.
- **Comparar dos fechas** (pestaña Arbolado): vegetación en la calle e interior, pasto y construido entre dos imágenes Wayback o la actual, en hectáreas y puntos; manzanas que ganan y pierden vegetación; avisos de estación distinta.
- **Exportar** (botón arriba a la derecha del mapa): PDF de dos hojas (A4 apaisada con el mapa, sólo escala y norte sobre la imagen, referencias chicas semitransparentes y título y fuentes en una franja debajo del mapa; un marco punteado en el mapa muestra lo que sale; A4 vertical con los datos y la estadística del encuadre), PNG del mapa y CSV de datos. El panel derecho se pliega con la lengüeta del borde del mapa.
- **Superficies** (pestaña Crecimiento): hectáreas de techo, vegetación, pasto, suelo sin verde, piletas y sombra, en parcelas y vía pública, y lotes por señales de vida; ámbito: vista del mapa, recorte, área compacta o extraurbana.
- **Arbolado en vivo**: ámbito "área urbana y suburbana" (baja sólo las teselas que tocan el poblamiento 2025 y mide sólo adentro) o "vista del mapa"; tiempo estimado antes de empezar, avance con tiempo restante, resolución automática hasta z16; los resultados quedan guardados en ese navegador (pestaña Datos → Qué está guardado).

## Método de alta resolución
Huellas de Google Open Buildings v3 (celda S2 95bb, confianza ≥ 0,70); galpones = más de 600 m² o alargados. Imagen Esri World Imagery (Vantor Legion, 26/01/2025, 0,34 m) clasificada en 2.075 teselas z18 (0,49 m) en techo (huellas de Google), árbol, pasto, suelo sin verde, pileta y sombra; cada píxel asignado a su parcela o al frente de vía pública de su manzana. Límites: manzana urbana si tiene al menos una vivienda (40 a 600 m²) y un cuarto de sus lotes construidos; unión por calles de hasta 70 m y relleno de vacíos internos; compacta = área continua con la plaza y lo contiguo de lote tradicional; extraurbana = agrupamientos de 8 o más viviendas (vecinas a menos de 70 m) separados, a menos de 3,5 km de la plaza. Validación: parcelas con construcción vs. viviendas del censo 2022 por radio, correlación 0,92.

Nota: las 632 ha compactas y 1.325 ha totales del Cuadro 2 del estudio de 2024 citado en Fuentes son del partido entero. Para la cabecera, ese estudio da 351 ha (1990) y 517 ha (2020 = 451 compactas + 66 extraurbanas).

## Método del poblamiento Landsat
NDVI máximo por época; media 3×3; umbral por época a mitad de camino entre la mediana del casco histórico y la del campo; mayoría espacial 5 de 9 y, en Landsat 8–9, mayoría temporal 2 de 3 años; persistencia hacia atrás (urbano en t sólo si urbano en t+1); componentes conectados al tejido catastral; se quitan rutas fuera del tejido y parches menores de 0,36 ha. Densidad aparente f = (NDVI rural − NDVI píxel) / (NDVI rural − NDVI casco denso): baja < 0,45 ≤ media < 0,70 ≤ alta. Grilla de 30 m (EPSG:3857), polígonos suavizados.

Límites: la escena de 1976 ve sólo el 62 % del casco (este); 1976–1980 combina 1976 y 1980. MSS a 60 m. Las épocas 1987–2011 tienen 2 escenas y las de 2013 en adelante 10 o 20: puede haber un escalón entre 2011 y 2013. La última época tiene menos confirmación posterior. No es un FOS medido.

## Datos (carpeta `datos`)
- `poblamiento_y_vegetacion_SAG.gpkg` (POSGAR 2007 faja 5, EPSG:5347), 16 capas: manzanas_2024 (con indicadores de alta resolución), parcelas_2024_partidas, parcelas_alta_resolucion_2025, edificios_google_open_buildings, poblamiento_urbano_2025, poblamiento_manzanas_landsat_por_epoca, piletas_2025, planta_urbana_1884, registro_grafico_1874, radios_censales_cabecera, via_publica, frentes_por_manzana, poblamiento_densidad_por_epoca, poblamiento_total_por_epoca, poblamiento_anillos_ingreso, poblamiento_envolvente_compacta.
- `alta_resolucion_estadisticas.json`: cifras de alta resolución por clase de loteo, poblamiento y validación censal.
- Las mismas capas en GeoJSON (WGS84).
- `poblamiento_estadisticas_1976-2026.csv`: superficie por época y densidad, envolvente y escenas.

### Campos de manzanas
`periodo` P1 registro inicial (partida mínima ≤ 3.450) · P2 posterior · P3 desde 2009 aprox. (≥ 12.344, supuesto a calibrar con convenios) · `pmin/pmed/pmax` partidas · `lot_m2` lote medio · `cloaca`, `agua` proporción de parcelas con red · `in84` fracción dentro de la planta de 1884 · `p84_*` fracción por cerramiento en 1884 · `viv1991…viv2022` viviendas por ha de tejido 2024 del radio · `hab1991…hab2022` habitantes por ha de tejido · `sat_anio` primera época en que la manzana supera el 50 % de ocupación satelital · `sat_ocup` % de la manzana cubierto por el poblamiento en 2025–2026 · `sat_dens` clase media de densidad de lo ocupado en 2025–2026 (1 baja, 2 media, 3 alta) · `ocup_1980`, `ocup_2011` % cubierto en 1976–1980 y en 2011.

### Campos de parcelas de alta resolución
`edif_n` edificaciones · `techo_m2` · `edif_max_m2` · `fos` techo/lote · `veg_arb_libre`, `pasto_libre`, `sinverde_libre` fracción del lote libre · `pileta` (0/1) y `pileta_m2` · `veg_arb_m2` · `vida` 0–4 y `vida_txt` · `clase` A traza antigua, B quinta, C loteo hasta 2009, D loteo desde 2009 · `manzana`.

Manzanas suman `fos`, `ocup_lotes`, `edif_ha`, `veg_int`, `veg_calle`, `vida_hab`, `piletas`, `urb` (urbana según el criterio), `n_viv`.

### Campos del poblamiento
`anio` año clave de la época · `epoca` rótulo · `sensor` · `escenas` cantidad · `fechas` fechas de las escenas · `densidad`/`clase` (capa por densidad) · `orden` (anillos) · `ha` superficie.

## Informe
`informe/Poblamiento_y_Vegetacion_Informe_SAG_2026-10.docx`: informe técnico (octubre 2026) con el método, la serie satelital, las lecturas y las preguntas que abre.

## Fuentes
Google Open Buildings v3 (CC BY 4.0 / ODbL) · Esri World Imagery (Vantor, 26/01/2025) · Humacata, L. y Di Paolo, M. J. (2024), «Análisis espacial de la expansión urbana en localidades menores de la cuenca del río Luján», Locale 9 · Atlas de Mensuras de Giles (AHG) · INDEC (procesamiento CMDOT) · Parcelario COU 2024 · USGS/NASA Landsat vía Esri (Landsat/MS) · Esri World Imagery y Wayback · EOX Sentinel-2 cloudless (CC BY 4.0 2016–2017; CC BY-NC-SA 4.0 desde 2018) · DLR WSF Evolution (CC BY 4.0) · ESA WorldCover 2021 (CC BY 4.0).

## Capa de Pagos ajustada (01/11/2026)

`datos/pagos_SAG.geojson` y la tabla `territorios` de `datos/pagos_SAG_territorios.gpkg` contienen ahora una cobertura limpia: los nueve Pagos y la Ciudad comparten sus límites, sin huecos ni superposiciones, y suman la superficie del partido (validada con `shapely.coverage_is_valid`). La capa municipal original está en `datos/pagos_SAG_original_2026-11-01.geojson`.

- Los 591 ha que la capa dejaba sin Pago (franjas ferroviarias y de la autopista, parte de Azcuénaga, Villa Espil y San Alberto) y las 58 ha superpuestas se repartieron por su eje (Voronoi por cercanía) entre los territorios vecinos.
- Azcuénaga: su zona urbana completa (27,7 ha) y las franjas que la separaban de Cañada de la Cruz se asignaron al Pago Campo y Ciudad, por decisión del CMDOT.
- La tabla `suelo_sin_pago` queda vacía. En el SIG, `DATA.limites`, `ter.poly`, `ter.box`, `recorte`, `stats` y `pueblos` se actualizaron. La población de los antiguos huecos (535 personas) se reparte según las parcelas que caen en cada Pago (`pob22_estimado_ex_sin_pago`, con ≈ en la portada).
- Completado el 01/11/2026 con las capas municipales de la carpeta SHP (ParcelasSAG 2024 COU, 13.661 parcelas; edificios.json, Google Open Buildings v3 de todo el partido, confianza ≥ 0,70): entran las 233 parcelas de los antiguos huecos (Azcuénaga 135 en Campo y Ciudad, San Alberto 47 en Tuyutí, Villa Espil 49 en Recuperación, 2 rurales en de a Caballo) y unas 360 huellas de edificación. Las parcelas nuevas llevan `ex_sin_pago: 1`; su período sale de la partida con los umbrales t0/t9 de la página. Las manzanas de los tres pueblos se rehicieron por geometría (parcelas contiguas), porque las claves del parcelario completo no coinciden con las del recorte anterior. Las estadísticas rurales se ajustaron sumando sólo lo que entra o sale.
- Sigue pendiente la serie Landsat 1976–2023 de esas franjas (el módulo «Detección multisensor» la calcula en vivo sobre el territorio nuevo) y la vegetación de alta resolución por lote.
