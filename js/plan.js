/* ===================================================================
   PLAN SAG 2020-2030 | Contenidos del Plan
   Fuente: Texto del Plan (borrador 02-2025), capítulos de Líneas
   propositivas, Sendas de la Comunidad, del Ambiente, de la Producción
   y el Comercio, del Habitar y Pueblos. Los textos son síntesis de
   divulgación; la versión íntegra es el documento oficial.
   =================================================================== */

window.PLAN_SAG = {

  /* ---------- LAS CUATRO SENDAS (con los Pueblos dentro del Habitar) ---------- */
  sendas: [
    {
      id: "comunidad",
      nombre: "Sendas de la Comunidad",
      corto: "Comunidad",
      color: "#4A7C3F",
      capitulo: "Capítulo III",
      rumbo: "Priorizar el crecimiento y la profundización del entretejido comunitario.",
      texto: "En una época donde los individualismos son tendencia, la construcción de una comunidad arraigada a una historia, a un territorio y a un modo de entender lo humano debe ser el trasfondo permanente de estas ocasiones y de todas las que surjan.",
      dato: { num: "38 m²", label: "de espacio verde público por habitante en la ciudad cabecera (la OMS recomienda 10 a 15 m²)" },
      ocasiones: [
        { t: "Parques y espacios verdes", d: "Parque Municipal Arturo Illia (adquirido en 1926), Parque Urbano Natural, Paseo de la Cañada de Giles (40 % realizado) y Parque Central del Boulevard: 25.000 m² liberados sobre la ex Ruta 7, con humedales de retención." },
        { t: "Espacios deportivos de proximidad", d: "La comunidad educativa planteó la falta de espacios deportivos seguros cerca de las escuelas. La transformación de la ex Ruta 7 abre lugar para playones y un SUM de usos múltiples." },
        { t: "Cementerios", d: "Un museo de sitio en el Cementerio Sud, donde trabajan arqueólogos, y una ampliación del cementerio pensada como espacio de memoria, sin jerarquías de clase y respetando la diversidad de creencias." },
        { t: "Hogar Infantil", d: "Que el “hogar” deje de ser una única institución en un solo edificio y se transforme en casas, con ambientes y acompañamientos según cada edad." },
        { t: "Adultos mayores", d: "Nuevas formas de habitar para quienes necesitan apoyo en la última etapa de sus vidas, sin asociar esa situación a la enfermedad ni a la dependencia del Hospital." },
        { t: "Salud pública", d: "El Hospital Municipal, inaugurado en 1905: crecer en servicios para el Partido y la región, prevención y atención primaria en todo el territorio, salud mental y adicciones." },
        { t: "Salud privada", d: "Tras el cierre de la Clínica San Fernando, buscar las formas de recuperar la atención privada en la localidad." }
      ]
    },
    {
      id: "ambiente",
      nombre: "Sendas del Ambiente",
      corto: "Ambiente",
      color: "#7BAF5E",
      capitulo: "Capítulo IV",
      rumbo: "Combinar un entorno único, natural y social, con margen de flexibilidad para una sociedad abierta al cambio.",
      texto: "Como totalidad que es, el ambiente no reconoce límites administrativos ni legales. Recuperar un ecosistema lleva mucho tiempo y destruirlo, un instante: estas decisiones requieren constancia.",
      cita: "“El diseño debería invitar a las personas de todos los ámbitos de actuación a participar de una conversación acerca de esta tensión.” — Tim Ingold",
      dato: { num: "+140", label: "años de actividad agrícola y extractiva sobre los suelos del Partido" },
      ocasiones: [
        { t: "Suelos", d: "Controlar las actividades que degradan la fertilidad: la agriculturización, la extracción para hornos de ladrillo y la venta clandestina de “tierra negra” que decapita campos." },
        { t: "Plazas rurales y senderos", d: "Los primeros espacios públicos en el campo, conectados por senderos para bicicletas y caminantes: SR Cucullú, SR Villa Ruiz, SR Scully y SR Av. Ntra. Sra. de Luján." },
        { t: "El paisaje como servicio público", d: "Así como el Municipio limpia calles y provee agua, que el ambiente y el paisaje sean un servicio público: producción agroecológica, personal que construya paisaje y espacios productivos públicos." },
        { t: "Reservas Urbanas Naturales", d: "La Reserva Las Dos Cañadas (ex Estancia La Chabela), creada por Ordenanzas 2418/21 y 2619/23: protege un humedal y un tramo del arroyo de Giles. Y reservas en todas las localidades." }
      ]
    },
    {
      id: "produccion",
      nombre: "Sendas de la Producción y el Comercio",
      corto: "Producción y Comercio",
      color: "#8B2020",
      capitulo: "Capítulo V",
      rumbo: "Una riqueza y una producción que incluyan a la mayor parte de la población y afecten lo menos posible al ambiente.",
      texto: "El Partido oscila entre los agronegocios, que concentran la tierra, y la presión inmobiliaria. Su alta conectividad es una posibilidad, pero también puede convertirse en un problema si no se conduce.",
      dato: { num: "3", label: "caminos fundantes atraviesan el Partido: el Real al Alto Perú, el de Mendoza y Chile y el de las Tropas" },
      ocasiones: [
        { t: "Caminerías", d: "Nuevos diseños de caminos para cada movilidad (maquinaria, autos, bicicletas, a pie, a caballo) y una base cartográfica completa de alcantarillas, suelos, arbolado y mantenimiento." },
        { t: "Pagos", d: "Recuperar la palabra “pago” para nombrar áreas rurales con identidad y gestión propias, con delegados y cesiones de espacios públicos. Propuestos, entre otros: Pago de a Caballo, Campo y Ciudad, Habitar Cañada de la Cruz, Preservación Tuyutí, Preservación Heavy, Producción Norte, Producción Sur y Recuperación." },
        { t: "Parques productivos y comerciales", d: "Muchos parques pequeños distribuidos en el Partido antes que pocos establecimientos grandes, cerca de donde viven los trabajadores." },
        { t: "Turismo", d: "Turismo de proximidad a escala de los pueblos: su atractivo es la tranquilidad, y el desarrollo turístico debe cuidar justamente eso." }
      ]
    },
    {
      id: "habitar",
      nombre: "Sendas del Habitar",
      corto: "Habitar",
      color: "#C8973A",
      capitulo: "Capítulo VI",
      rumbo: "Concebir el territorio no como un espacio a ocupar, sino como un entorno integral del cual somos parte.",
      texto: "Al menos desde mediados del siglo XIX, las zonas rurales fueron pensadas solo en términos de producción y no del habitar como totalidad. Hoy hay gente que vive del campo y gente que quiere vivir en el campo.",
      dato: { num: "18 %", label: "de viviendas vacías en el Partido (Censo 2010), mientras 1.291 familias figuraban en el Registro Municipal de Vivienda (2020)" },
      ocasiones: [
        { t: "Acceso a la vivienda", d: "El Estado construyó apenas 660 viviendas en 80 años. Se propone construir, acompañar, apoyar y regular: asistencia total o de materiales, cooperativas, compras conjuntas de tierra, alquileres y materiales abundantes como el adobe." },
        { t: "Puestos", d: "Un nuevo modo de habitar la ruralidad, con el nombre de nuestra tradición: agrupamientos de muy baja densidad (5 a 30 hab/ha, art. 31 del Decreto-Ley 8912), gestión comunitaria y prioridad al sol." },
        { t: "Biodiversidad urbana y corredor ambiental", d: "Recuperar los “bajos”, humedales y cursos de agua dentro de la ciudad y los pueblos, conectados por corredores con vegetación nativa." },
        { t: "Boulevard Central (ex Ruta 7)", d: "Reconfigurar el viejo camino a Mendoza como parque, integrado al Paseo de la Cañada, con un bosque como portal de ingreso por el este." },
        { t: "Reconfiguración del Tiro Federal", d: "Relocalizar la práctica de tiro y recuperar el predio patrimonial (1902) para continuar el Paseo de la Cañada." },
        { t: "Nuevo parador de colectivos", d: "Trasladar la terminal a la puerta de ingreso de la ciudad, sobre la Cañada, para liberar la ampliación del Hospital." },
        { t: "Plan Particularizado Norte", d: "Un crecimiento de la ciudad que no dependa de infraestructuras de alto impacto: diversidad de parcelas, vivienda integrada, sol, agua de lluvia y convenios urbanísticos (Ley 14.449)." }
      ]
    }
  ],

  /* ---------- PUEBLOS: cada pueblo es una Ocasión (Sendas del Habitar, Cap. VII) ---------- */
  pueblosComun: [
    "Acompañar la residencialidad en el pueblo y en la ruralidad",
    "Trabajo local y asociativismo",
    "Salud: prevención y atención accesibles",
    "Residuos y cloacas en el lugar (humedales depuradores) y energías alternativas",
    "Comunicación y redes"
  ],
  pueblos: [
    { id: "azcuenaga", nombre: "Azcuénaga", origen: "Pueblo ferroviario · estación de 1880", ocasiones: [
      "Nuevos poblamientos en la ruralidad",
      "Reconfiguración del predio del ferrocarril, con un espacio deportivo cubierto para las escuelas",
      "Turismo ordenado y sectorizado, y patrimonio",
      "Estacionamientos para visitantes en los accesos y rotondas de ingreso",
      "Plazas rurales y producción agroecológica de alimentos"
    ]},
    { id: "cucullu", nombre: "Cucullú", origen: "Pueblo ferroviario", ocasiones: [
      "Su vinculación cotidiana con Giles",
      "Reconfiguración del predio del ferrocarril",
      "Creación de plazas rurales",
      "Regulación turística y patrimonial",
      "Producción agroecológica de alimentos"
    ]},
    { id: "ruiz", nombre: "Villa Ruiz", origen: "Pueblo ferroviario · Cañada de la Cruz", ocasiones: [
      "Reconfiguración del predio del ferrocarril",
      "Regularización del barrio cerrado “Chacras de San Andrés”",
      "Protección, acceso y recuperación ambiental de la Cañada de la Cruz y manejo de su cuenca",
      "Regulación turística y patrimonial junto a Carlos Keen y Azcuénaga",
      "Producción agroecológica"
    ]},
    { id: "franklin", nombre: "Franklin", origen: "Pueblo ferroviario · 1884 · único ramal con pasajeros", ocasiones: [
      "Nuevas formas de habitar en el pueblo y en el campo",
      "Trabajo local y asociativismo para un tejido productivo propio",
      "Servicios de salud y programas comunitarios",
      "Manejo de residuos en el lugar y energías alternativas",
      "Accesibilidad y comunicación"
    ]},
    { id: "tuyuti", nombre: "Tuyutí", origen: "Pueblo ferroviario · 1907", ocasiones: [
      "Reconfiguración urbana para un crecimiento ordenado",
      "Reconfiguración del predio del ferrocarril como espacio para la comunidad",
      "Turismo rural y patrimonial",
      "Producción agroecológica de alimentos"
    ]},
    { id: "solis", nombre: "Solís", origen: "Pueblo ferroviario · sobre la Ruta 8", ocasiones: [
      "Ampliación urbana planificada",
      "Nueva zona industrial entre Solís y Azcuénaga y sobre la Ruta 8",
      "Regularización del predio del ferrocarril y plazas rurales",
      "Seguridad urbana y rural con puntos de control",
      "Bordes de autopista con protección visual y sonora, y paradas de colectivo seguras"
    ]},
    { id: "espil", nombre: "Villa Espil", origen: "Nacida junto a la Ruta 7", ocasiones: [
      "Ampliación urbana planificada",
      "Zona industrial en la actual Reserva Urbana",
      "Recuperación de los suelos decapitados por la extracción de tierra fértil",
      "Regularización del barrio “Lagunas de las Pampas”",
      "Turismo y patrimonio"
    ]},
    { id: "alberto", nombre: "San Alberto", origen: "Nacida junto a la Ruta 7", ocasiones: [
      "Consolidar un tejido urbano antiguo pero sin habitar",
      "Construir en el tiempo una identidad común",
      "Bordes sobre la autopista y paradas de colectivo accesibles",
      "Manejo de las aguas de lluvia",
      "Turismo rural"
    ]}
  ],

  /* ---------- LAS LÍNEAS PROPOSITIVAS: 46 en 12 familias ---------- */
  familias: [
    { id: "P", nombre: "Producción", texto: "El marco productivo, con foco en los agronegocios y la necesidad de una producción más amigable con el ambiente." },
    { id: "H", nombre: "Habitar", texto: "El territorio como un continuo con distintas densidades, habitado también por animales y plantas." },
    { id: "A", nombre: "Administración", texto: "El marco legal y administrativo que asegure la realización del Plan." },
    { id: "R", nombre: "Rituales", texto: "Los rituales generan pertenencia y lazos afectivos que van más allá de “crear conciencia”." },
    { id: "E", nombre: "Educativas", texto: "La educación formal y la que la excede: saberes y valores colectivos." },
    { id: "S", nombre: "Salud", texto: "El sistema de salud en sus cuatro niveles, de la prevención a los servicios regionales." },
    { id: "M", nombre: "Movilidad", texto: "Rutas, caminos y transportes, también caminar, la bicicleta y el caballo." },
    { id: "RR", nombre: "Reconfiguración", texto: "Lugares y sistemas que piden transformarse." },
    { id: "C", nombre: "Comercios", texto: "La valorización de los productos locales en la localidad y la región." },
    { id: "En", nombre: "Energías", texto: "Agua, sol, tierra y aire como energías y como soportes de la vida." },
    { id: "Et", nombre: "Etarias", texto: "Los momentos de la vida de mayor vulnerabilidad: la niñez y la vejez." },
    { id: "G", nombre: "Género", texto: "El espacio público como lugar seguro e inclusivo." }
  ],
  lineas: [
    ["P1", "Producción industrial cercana", "Productos industrializados de pequeña escala con materias primas y mano de obra locales."],
    ["P2", "Alimentos – Escala Partido", "Recuperar la cultura de cultivar verduras y criar animales de modo saludable, desde lo doméstico hasta lo regional."],
    ["P3", "Producción intensiva primaria – Ruta 41", "El corredor de la Ruta 41 como localización estratégica de las producciones intensivas tradicionales."],
    ["P4", "Producción Pymes – Pueblos", "Pequeñas pymes que se integren sin conflictos con los pueblos y diversifiquen el empleo."],
    ["P5", "Producción cooperativista – Sectores", "Asociaciones entre trabajadores con objetivos y habilidades compartidas."],
    ["P6", "Vialidades productivas – Redes y oportunidades", "Asociaciones espaciales favorables para el intercambio de insumos y el tratamiento de impactos."],
    ["P7", "Producción agropecuaria – Pagos y tensiones", "La localización adecuada de cada producción según su escala y su impacto."],
    ["H1", "Habitar rural – Sectores", "Nuevas oportunidades de habitar el campo que fortalezcan la permanencia de quienes ya lo habitan."],
    ["H2", "Plazas rurales – Sectores", "Parques y plazas que hagan posible la experiencia pública del paisaje rural."],
    ["H3", "Parques, reservas, paseos, plazas – Sectores", "Seguir incorporando espacios naturales a medida que crece el territorio."],
    ["H4", "Residencialidad – Viviendas y sus densidades", "Redefinir las formas de habitar, más allá del lote y la vivienda única."],
    ["A1", "Normativas – Sectores", "Actualizar la legislación local cada vez que aparecen nuevas formas de vida, producción o relación."],
    ["A2", "Instituciones – Gestión integrada de sectores", "Estimular y acompañar nuevas formas colectivas e instituciones."],
    ["A3", "Gestión de la seguridad – Planificación y control", "La inseguridad no es un problema grave del Partido; hay que crear mecanismos para que siga así."],
    ["A4", "Planificación de los servicios – Gestión, mantenimiento, obras", "La obra pública de servicios debe acompañar la planificación territorial."],
    ["R1", "Espacios colectivos – Parques", "Lugares que se comparten en el tiempo y marcan simbólicamente la vida común."],
    ["R2", "Espacios de fiestas – Espacios escalares", "Las fiestas que se consolidan merecen su espacio, pensado primero para la propia población."],
    ["R3", "Espacios de conmemoración – Cementerios", "Actualizar los espacios de memoria, que no se redefinen desde hace más de un siglo."],
    ["R4", "Espacios deportivos – Sectores", "El deporte como rito de encuentro, con espacios cercanos a escuelas y espacios públicos."],
    ["E1", "Trabajo y maternidad/paternidad – Guarderías", "Espacios de primera infancia para familias que trabajan."],
    ["E2", "Espacios deportivos – Playones de proximidad", "Playones cerca de las escuelas, que perdieron sus patios al crecer."],
    ["E3", "Vinculación con el trabajo – Capacitación, laboratorios y burbujas", "Formar a quienes trabajan y a quienes todavía no pudieron acceder al trabajo."],
    ["E4", "Nuevos aprendizajes – Nuevos espacios de formación", "Espacios educativos presenciales y a distancia, también en los pueblos y el campo."],
    ["E5", "Espacios deportivos – Alta competencia", "Infraestructura y formadores para una temática incipiente que genera orgullo colectivo."],
    ["S1", "Prevención 1.° nivel – Salas, agentes, salud mental", "Salas barriales y rurales con agentes que hagan seguimiento en el territorio."],
    ["S2", "Planificación de la atención 2.° nivel", "Distribuir territorialmente la atención y los controles."],
    ["S3", "Planificación hospitalaria 3.° nivel – Incremento de servicios", "Ampliar los servicios y su complejidad a medida que crece la región."],
    ["S4", "Servicios regionales e investigación 4.° nivel", "Servicios de escala regional: rehabilitación, neonatología, salud mental."],
    ["M1", "Nuevas caminerías – Espacios de vinculación territorial", "Caminos para andar también a caballo, en bicicleta y a pie."],
    ["M2", "Sostenibilidad y preservación – Planificación y recursos", "Planificar y sostener el cuidado de los espacios de la movilidad."],
    ["RR1", "Niñez y adolescencia – Hogares temporales", "Nuevos espacios de cuidado y desarrollo para chicos y chicas en situación vulnerable."],
    ["RR2", "Edilicia – Espacios pasados para nuevas vivencias", "Actualizar el uso de edificios patrimoniales sin perder el patrimonio."],
    ["RR3", "Productiva – Transformación sostenible", "Sistemas de producción de alimentos con justicia social, cuidado ambiental y salud."],
    ["C1", "Comercialización focalizada – Densidades urbanas", "Actividades comerciales asociadas a la cercanía en la ciudad y los pueblos."],
    ["C2", "Comercialización focalizada – Densidades rurales", "Actividades comerciales asociadas a la residencia y la producción rural."],
    ["C3", "E-commerce local – Espacialización de la virtualidad", "Comercio digital de los productos locales."],
    ["C4", "Turismo – Sectores territoriales", "Turismo de proximidad, controlado y a escala."],
    ["En1", "Agua – Reservas, reciclajes", "Proteger su calidad y manejar excesos y faltantes cuidando humedales, arroyos y cañadas."],
    ["En2", "Sol – Insumo eléctrico y asoleamiento", "Más sol en los hábitats de la ciudad y energía solar en usos residenciales y productivos."],
    ["En3", "Tierra – Recuperación de materias", "Cuidar la salud del suelo, soporte de millones de seres vivos."],
    ["En4", "Aire – Insumo eléctrico y salud", "Preservar su calidad y aprovecharlo como energía renovable."],
    ["En5", "Economía circular", "Compartir, alquilar, reutilizar y reciclar para usar menos recursos y crear empleo."],
    ["Et1", "Niñez – Espacio público", "Diseñar el espacio público desde los primeros años de vida."],
    ["Et2", "Adultos mayores – Espacio público", "Espacio público e instituciones para una vejez más activa y autónoma."],
    ["G1", "Inclusión espacial – Espacio público", "La perspectiva de género en el diseño del espacio que compartimos."],
    ["G2", "Capacitaciones – Sectores", "Debate y capacitación en temas de género."]
  ]
};
