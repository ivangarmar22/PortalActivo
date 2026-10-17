# Auditoría de diseño UI/UX y responsive

Octubre de 2026. Cubre el rediseño de la interfaz y la auditoría responsive en móvil y tableta, con prioridad en las votaciones, porque la mayoría de los vecinos entrará desde el móvil.

## 1. Diagnóstico de la versión anterior

La primera versión funcionaba, pero tenía el aspecto genérico de una aplicación montada con componentes por defecto:

| Problema                                                                                    | Por qué importa                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Todas las superficies eran tarjetas blancas idénticas, con borde gris fino y el mismo radio | Sin jerarquía, nada guía la mirada hacia lo importante |
| Una sola familia tipográfica en uno o dos pesos                                             | Titulares y datos no se distinguen; aspecto plano      |
| Ninguna presencia de la comunidad (logo, nombre)                                            | La aplicación no se siente «de» Terrazas del Cañaveral |
| El color solo aparecía en los botones                                                       | Interfaz monótona y sin acentos                        |
| Panel con 8 métricas del mismo tamaño                                                       | Todo pesa igual y no hay un «qué hago ahora»           |
| Portal del vecino sin navegación (solo votaciones)                                          | No escalaba a incidencias, reservas, avisos ni recibos |
| Logo genérico (casilla con tejado)                                                          | Poco reconocible y sin personalidad                    |

## 2. Dirección «Editorial residencial»

| Decisión        | Detalle                                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paleta**      | Fondo de papel cálido `#F4F1E8`, tinta verde profunda `#0E2A2C` para el cromo (barra lateral, cabeceras, barra inferior) y **latón** del logo de la comunidad (`#AB8D39`, variantes `#CDAE55` y `#765E1D`) como acento. El petróleo `#0F4C51` queda para las acciones principales |
| **Tipografía**  | **Fraunces** (serif de óptica variable) para titulares y cifras; **Instrument Sans** para la interfaz. Antetítulos en versalitas de latón y una línea fina con un tramo dorado bajo cada cabecera                                                                                 |
| **Profundidad** | Sombras suaves en capas en lugar de bordes duros; paneles de tinta con una retícula hexagonal muy tenue inspirada en el logo de la comunidad                                                                                                                                      |
| **Jerarquía**   | Cada pantalla de inicio empieza por un saludo y un bloque de «Requiere tu atención» con enlaces directos; las métricas secundarias van después                                                                                                                                    |
| **Estados**     | Píldoras con icono + texto + color (nunca solo color) para juntas, preguntas, incidencias, recibos y publicaciones                                                                                                                                                                |
| **Comunidad**   | El logo de Terrazas del Cañaveral aparece en la barra lateral, en la cabecera del portal y en el panel                                                                                                                                                                            |

### Logo de PortalActivo

Símbolo SVG: un **portal** (arco de entrada) de latón con grosor real, el hueco en sombra y la casilla marcada del voto iluminada dentro.

Criterios, tomados de las [pautas de iconos de Apple](https://developer.apple.com/design/human-interface-guidelines/app-icons) y de las tendencias actuales de identidad:

- **un solo concepto** como foco;
- **la profundidad sale del volumen y de degradados análogos y contenidos**, no de efectos;
- **nada que se empaste a tamaño pequeño**.

| Pieza   | Función                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Azulejo | Tinta con un degradado vertical suave y un filo de luz arriba                            |
| Marco   | Latón con degradado metálico y una sombra que lo separa del azulejo                      |
| Derrame | El grosor del marco visto por dentro del hueco, en latón oscuro: da el efecto de volumen |
| Casilla | En crema, como la luz que sale del portal                                                |

Es la cuarta versión:

1. La primera era plana.
2. La segunda (marco y puerta hundida) seguía resultando estática.
3. La tercera, una puerta entreabierta con luz, hoja, pomo, halo y luz en el suelo, tenía unas 13 piezas: demasiado cargada y poco profesional a tamaño pequeño.

Para la actual se compararon cinco variantes a 160, 64, 40, 32, 24 y 16 px sobre fondo claro y oscuro: la tercera versión, arcos en capas con y sin casilla, marco con hueco profundo, y marco con grosor. Se descartaron los arcos en capas, porque las capas de latón se confundían entre sí. Ganó el marco con grosor: tiene 4 piezas, se reconoce a 16 px y su volumen se percibe sin efectos. Antes se habían descartado la de la dovela, que a tamaño pequeño parecía una campana, y la de azulejo dorado, que competía con el logo de la comunidad.

Los degradados usan identificadores únicos por instancia para que varios logos en la misma página no se interfieran. La marca se acompaña de la palabra «Portal*Activo*» (sans + serif cursiva en latón). Por petición expresa, en el panel de administración no aparece encima del menú, que empieza directamente con la comunidad.

### Contraste (WCAG 2.2 AA, texto ≥ 4,5:1)

Se midieron todos los pares de color de texto. El menor es **5,2:1**: latón oscuro sobre crema. Los estados quedan entre 5,5:1 y 8:1; el texto sobre tinta, entre 6,2:1 y 12,5:1.

## 3. Auditoría responsive (móvil y tableta)

### Método

Un script de Playwright recorre las pantallas en 7 tamaños reales y mide, en cada una:

- el desbordamiento horizontal;
- los objetivos táctiles de menos de 44 px;
- los campos con texto de menos de 16 px (Safari en iPhone y iPad hace zoom al enfocarlos);
- el texto de menos de 11 px.

Además se guardan capturas para revisarlas a mano.

| Dispositivo        | Viewport (CSS px) |
| ------------------ | ----------------- |
| Android pequeño    | 360 × 740         |
| iPhone SE          | 375 × 667         |
| iPhone 15          | 390 × 844         |
| Pixel 7            | 412 × 915         |
| Tableta vertical   | 768 × 1024        |
| Tableta horizontal | 1024 × 768        |
| iPad Pro           | 1024 × 1366       |

Recorrido: acceso (ambas modalidades), lista de juntas, junta con votación, diálogo de confirmación del voto, inicio del portal, incidencias, detalle de incidencia, reservas, avisos, recibos, cuenta y menú «Más». En tableta, además, el panel de administración, la junta en curso y la gestión de una incidencia.

### Resultados

| Comprobación                     | Antes                                                                                           | Después                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Desbordamiento horizontal        | 3 pantallas (incidencias a 360 y 375 px; recibos a 360 px)                                      | **0**                                                               |
| Campos con zoom en iOS (< 16 px) | Todos los formularios, incluido el de votar                                                     | **0**                                                               |
| Texto < 11 px                    | 0                                                                                               | 0                                                                   |
| Objetivos táctiles < 44 px       | Más de 100 (pestañas de 29 px, botones de 36 px, enlaces de 18 px, cierre de diálogos de 16 px) | **24, todos de 40–42 px** (por encima del mínimo WCAG 2.2 de 24 px) |

### Cambios aplicados

1. **Tamaños táctiles según el tipo de puntero** (`pointer: coarse`), no según el ancho: los botones pasan a 44 px, los campos a 44 px y las pestañas a 48 px en móvil y tableta. Con ratón se mantiene la densidad de escritorio.
2. **Campos siempre a 16 px**, para que el iPhone no haga zoom al escribir el PIN o el DNI.
3. **Listas que no se desbordan**: las rejillas usan `grid-cols-1` (`minmax(0, 1fr)`), así que un nombre largo como «Ascensores Norte, S.L.» se recorta con «…» y no ensancha la página. Las barras de pestañas se desplazan horizontalmente si no caben.
4. **Botones de cerrar** de diálogos y paneles a 44 × 44 px (antes 16 px).
5. **Enlaces sueltos** («Ver todas», «← Votaciones», «Crear mi contraseña») con 44 px de alto táctil.
6. **Confirmación del voto junto al pulgar**: en móvil el diálogo aparece abajo, en tableta y escritorio centrado.
7. **Botón de votar que se explica**: sin opción elegida dice «Elige una opción» en lugar de mostrarse deshabilitado sin más.
8. **Navegación del portal**:
   - En móvil, barra inferior fija con 5 accesos (Inicio, Votaciones, Incidencias, Reservas, Más) que respeta el área segura del iPhone.
   - En tableta y escritorio, fila de navegación propia bajo la cabecera, para que el nombre de la comunidad no se recorte.
9. **Selector de espacios** de reservas en carrusel horizontal en móvil, en lugar de tres tarjetas apiladas.

### Elementos que siguen por debajo de 44 px

- **Botón de radio de cada opción de voto** (20 px): no es un problema real, porque toda la fila de la opción (56 px de alto) es pulsable.
- **Filtros de incidencias y pestañas** (40–42 px): están dentro de un contenedor con relleno y la zona efectiva es mayor.
- **Botones pequeños en las tarjetas de preguntas del administrador** (40 px): uso esporádico y por personal habituado.

## 4. Verificación

- Pruebas E2E en escritorio y en Pixel 7 (`e2e/responsive.spec.ts`), incluida la comprobación de desbordamiento en cada pantalla.
- Flujo completo con dos navegadores: vecino en móvil y administración en escritorio (`e2e/voting-flow.spec.ts`, `e2e/modules.spec.ts`).
- Revisión manual de las capturas de los 7 tamaños.

## 5. Segunda revisión visual

Se revisaron con capturas los estados que el recorrido normal no muestra: portátil de 1280 × 720, diálogos abiertos, menús desplegables y formularios en móvil.

| Problema encontrado                                                                                            | Corrección                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barra de desplazamiento visible en las pestañas «Vecinos / Solo votar» en escritorio (scroll vertical de 1 px) | Eje vertical bloqueado y barra oculta; en móvil se sigue pudiendo deslizar                                                                           |
| Barra de desplazamiento del menú lateral blanca (la del sistema en Windows)                                    | Barras finas del color de la superficie en toda la aplicación, oscuras en el menú, con un fundido en los bordes del menú                             |
| En pantallas bajas la sección activa del menú quedaba oculta bajo el pie                                       | Menú más compacto con ratón (44 px en táctil) y desplazamiento automático hasta la sección activa                                                    |
| Pestaña activa casi del mismo color que la barra                                                               | Pestaña activa en blanco con sombra; inactivas en gris                                                                                               |
| Diálogos sobre fondo beige, con poco contraste con los campos                                                  | Diálogos en blanco con sombra elevada                                                                                                                |
| Formularios en móvil como caja centrada que chocaba con la barra inferior                                      | En móvil se abren como hoja desde abajo y título alineado a la izquierda                                                                             |
| Días de reserva en escritorio repartidos en 13 + 1                                                             | Calendario de dos semanas (7 + 7) desde tableta                                                                                                      |
| Franjas de pádel con la hora repetida («18:30 · 18:30–20:00»), también en la configuración de espacios         | Si el nombre de la franja es una hora, solo se muestra el intervalo. El fallo venía de una expresión regular que había perdido sus barras invertidas |
| Formulario de «Mi cuenta» sin ocupar su columna y sin indicar la sección activa                                | Ocupa la columna; el icono de cuenta se resalta                                                                                                      |
| Primera columna de las tablas pegada al borde                                                                  | Más margen lateral y cabeceras en versalitas                                                                                                         |
| Botón deshabilitado «Elige una opción» con texto claro sobre verde apagado, difícil de leer                    | Fondo neutro y texto gris oscuro (5:1)                                                                                                               |
| Aviso «Consulta informativa»                                                                                   | Retirado de todas las pantallas y del PDF, a petición del cliente                                                                                    |
| Texto «Administración» en la cabecera de la portada                                                            | Retirado; queda el botón «Soy administrador»                                                                                                         |

## 6. Ajustes de detalle

| Petición                                            | Cómo se ha resuelto                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mano al pasar por encima de lo pulsable             | Tailwind 4 deja los botones con la flecha. Una regla base pone la mano en botones, pestañas, opciones de radio, casillas, interruptores, selectores, opciones de menú y etiquetas de casillas. Los elementos deshabilitados muestran «no permitido»                                                                |
| Logo con personalidad y profundidad                 | Portal entreabierto con luz cálida (ver el apartado 2). También en el favicon                                                                                                                                                                                                                                      |
| Pie del menú lateral del administrador              | Una sola fila: inicial, nombre con el email debajo y el botón de cerrar sesión a la derecha, con una etiqueta emergente «Cerrar sesión». Sin el texto «Administrador». Igual en el menú desplegable de móvil                                                                                                       |
| Importes con punto de miles                         | En español, `Intl` no agrupa las cifras de 4 dígitos («1840,00 €»). Se fuerza la agrupación: «1.840,00 €». Afecta a recibos, documentos, panel, portal y PDF de demostración. Al escribir un importe se acepta con o sin punto                                                                                     |
| «Volver» en los accesos de administración y vecinos | Flecha y texto arriba a la izquierda, con 44 px de zona táctil. En escritorio, en el panel de tinta sobre el logo; en móvil y tableta, en la cabecera con el logo a la derecha. Vuelve a la portada si se llegó desde ella o por un enlace directo. En el paso «Crea tu contraseña» vuelve al formulario de acceso |

Comprobado con capturas en 1440 × 900, 1024 × 768, 820 × 1180, 390 × 844 y 360 × 740, sin desbordamientos, y con una prueba E2E nueva del botón «Volver» en escritorio y móvil.

## 7. Márgenes laterales en móvil y tableta

Una auditoría automática recorrió 7 pantallas públicas, 7 del portal y 7 de administración en 360, 390, 768, 820 y 1024 px. Buscaba tarjetas, botones y textos a menos de 12 px del borde en móvil o 20 px en tableta, también con los carruseles horizontales desplazados a la mitad y al final.

| Problema                                                                                                                   | Causa                                                                                                                                                                                          | Corrección                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reservas en móvil: la primera tarjeta de espacio y el primer día quedaban pegados al borde (0 px), al cargar y al deslizar | Los carruseles llegan al borde de la pantalla y encajan cada tarjeta al inicio. Sin `scroll-padding`, el navegador las alinea contra el borde                                                  | `scroll-padding` de 16 px: las tarjetas encajan respetando el margen de la página                                                                             |
| Reservas en móvil: el borde superior del espacio seleccionado se veía cortado, igual que la sombra del día seleccionado    | Un contenedor con desplazamiento horizontal también recorta en vertical. El borde del seleccionado es un anillo que se dibuja por fuera de la tarjeta, y el carrusel no tenía relleno superior | Relleno vertical en los dos carruseles                                                                                                                        |
| Tableta: márgenes de solo 16 px y la barra de secciones cortaba «Recibos y docum…» en el borde                             | Mismo margen que en móvil                                                                                                                                                                      | Margen de 24 px desde 640 px en el portal y en la cabecera de administración. Etiquetas cortas («Avisos», «Recibos») en la barra hasta el ancho de escritorio |
| Recibos a 360 px: la pestaña «Documentos de la comunidad» se salía                                                         | Texto largo                                                                                                                                                                                    | Pestañas a dos columnas iguales en móvil, con «Documentos»                                                                                                    |
| Menú de administración en móvil: la X de cerrar no estaba centrada en la tarjeta de la comunidad                           | Era el botón genérico del panel, fijo en la esquina                                                                                                                                            | La X va dentro de la fila de la comunidad, centrada en vertical                                                                                               |

Las tablas de administración (participación y recibos) se desplazan en horizontal dentro de su propia caja con borde. No quedan pegadas al borde de la pantalla.
