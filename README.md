# Informe ONPE + escenario extranjero Datum

Sitio web estático para visualizar datos oficiales de ONPE y una proyección analítica complementaria basada en un escenario de voto extranjero Datum mientras exista voto extranjero pendiente.

> **Importante:** este proyecto no reemplaza los resultados oficiales de ONPE/JNE. La página muestra una estimación dinámica por corte, útil para análisis, pero no constituye proclamación oficial.

## Sitio publicado

```text
https://edwardwhitetower.github.io/reporte-onpe-datum/
```

## Objetivo del proyecto

El objetivo es presentar, de forma clara y verificable:

- el avance oficial del conteo publicado por ONPE;
- la ventaja actual entre candidatos;
- una proyección nacional sin voto extranjero;
- una proyección ajustada incorporando el voto extranjero;
- una tabla regional y provincial para revisar dónde se concentra la variación del conteo;
- una prueba de sensibilidad del volumen extranjero mientras exista voto extranjero pendiente;
- una comparación automática contra el corte válido anterior.
- un historial de cortes válidos para auditar la evolución del análisis.

## Metodología resumida

El informe combina tres componentes principales:

### 1. Datos oficiales ONPE ya contabilizados

Se toman como base los votos y actas contabilizadas publicados por ONPE.

### 2. Proyección Perú sin extranjero

La proyección se calcula usando el nivel más desagregado disponible.

El modelo actual funciona así:

- si todas las provincias de un departamento cargan correctamente, ese departamento se proyecta a nivel provincial;
- si una o más provincias de un departamento fallan, el sistema usa el total departamental completo como respaldo;
- esto evita que una falla temporal en la carga de provincias distorsione la proyección nacional por omisión de territorios completos o parciales.

Por tanto, la fuente de proyección puede ser:

```text
provincia
```

o:

```text
hibrido_provincia_departamento
```

### 3. Voto extranjero

Mientras exista voto extranjero pendiente, el informe usa un método mixto:

- los votos extranjeros ya contabilizados por ONPE se respetan tal como están;
- solo el voto extranjero pendiente se estima usando el escenario Datum;
- el escenario Datum utilizado es: **Keiko 62.67% / Sánchez 37.33%**.

Cuando el voto extranjero quede contabilizado por ONPE, el cálculo principal deja de usar Datum y pasa a usar solo el voto extranjero oficial ONPE.


## Umbral extranjero ya superado

Cuando el porcentaje requerido para Keiko en el extranjero pendiente es negativo, la web ya no lo muestra como un porcentaje negativo. En su lugar, lo presenta como:

```text
Ya superado
Keiko no depende del extranjero pendiente
```

Esto significa que, bajo el modelo publicado, el voto extranjero ya contabilizado alcanza para compensar la desventaja interna proyectada antes de aplicar el escenario Datum al extranjero pendiente.

## Prueba de sensibilidad del volumen extranjero

Mientras exista voto extranjero pendiente, la página muestra una prueba de sensibilidad con variaciones del volumen estimado de votos extranjeros válidos.

Estos escenarios no son pronósticos independientes. Su objetivo es medir la robustez del resultado si el volumen final de votos extranjeros termina por debajo o por encima del estimado actual.

La tabla usa escenarios como:

```text
Estimado ONPE -20%
Estimado ONPE -10%
Estimado ONPE actual
Estimado ONPE +10%
Estimado ONPE +20%
```

Esto permite evaluar si el resultado depende de un volumen extranjero muy preciso o si se mantiene estable incluso con variaciones razonables del estimado.


```text
Mientras hay extranjero pendiente:
  Proyección Perú sin extranjero
  + voto extranjero ONPE ya contabilizado
  + voto extranjero pendiente estimado con Datum

Cuando el extranjero está cerrado:
  Proyección Perú sin extranjero
  + voto extranjero oficial ONPE
```

## Historial de cortes

El archivo `data/history.json` conserva un resumen de los cortes válidos. Solo se incluyen cortes que pasaron validación técnica y generaron ZIP de datos. Los intentos bloqueados por preflight no se registran como resultados.

## Archivos principales

```text
index.html
style.css
app.js
README.md
.nojekyll
data/report-data.json
data/regions.csv
data/provinces.csv
data/province-errors.csv
data/fallback-departments.csv
data/history.json
```

### Descripción de archivos

- `index.html`: estructura principal de la página.
- `style.css`: estilos visuales y diseño responsive.
- `app.js`: renderiza tarjetas, resumen nacional, metodología, historial, comparación contra el corte anterior, tablas, filtros, fallback departamental y prueba de sensibilidad del volumen extranjero.
- `data/report-data.json`: archivo principal usado por la página para mostrar los resultados y métricas calculadas.
- `data/regions.csv`: detalle por departamento o región.
- `data/provinces.csv`: detalle por provincia usado para la proyección más desagregada.
- `data/province-errors.csv`: registro de provincias que no pudieron procesarse, si existieran.
- `data/fallback-departments.csv`: registro de departamentos donde se usó respaldo departamental por provincias faltantes.
- `data/history.json`: historial resumido de cortes válidos.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.
- `README.md`: documentación general del proyecto.

## Advertencia metodológica

Este sitio presenta un escenario analítico no oficial. Los datos oficiales son únicamente los publicados por ONPE y, posteriormente, los validados por JNE.

La proyección puede cambiar entre cortes porque las actas pendientes dentro de una provincia o departamento no necesariamente tienen la misma distribución electoral que las actas ya contabilizadas.

Cuando una provincia no puede procesarse temporalmente, el modelo usa el total departamental como respaldo para evitar sesgos por omisión. Esto mejora la estabilidad del cálculo, pero debe ser leído como una decisión metodológica de respaldo.

Por eso, el informe debe leerse como una **estimación dinámica por corte**, no como una predicción definitiva ni como resultado oficial.



## Mapa territorial profesional

La página incluye un mapa coroplético dinámico con la silueta real del Perú y sus departamentos.

El mapa se renderiza en el navegador con D3 y se llena automáticamente con `data/report-data.json`.

Modos de visualización:

```text
Diferencia proyectada de votos
Porcentaje proyectado de Keiko
Actas enviadas al JEE
Actas contabilizadas
```

La geometría geográfica se carga como GeoJSON departamental. La página primero intenta usar una copia local en `data/peru_departamental_simple.geojson`; si no existe, usa fuentes externas de respaldo de Highcharts Map Collection.

Cada región muestra tooltip con:

```text
ganador proyectado
diferencia proyectada
votos Keiko / Sánchez
porcentajes regionales
actas contabilizadas
actas enviadas al JEE
```

Esta visualización mejora la lectura pública porque permite identificar de forma inmediata qué territorios empujan el margen de cada candidato.

## Estado del escenario

La página incorpora una sección de lectura matemática bajo el modelo publicado.

El estado puede mostrarse como:

```text
Escenario abierto bajo el modelo
Escenario favorable a Keiko bajo el modelo
Victoria virtual de Keiko bajo el modelo
Alta confianza: victoria virtual de Keiko bajo el modelo
Escenario matemáticamente consolidado bajo el modelo
```

La condición fuerte usa esta prueba:

```text
ventaja segura ante extranjero =
Perú sin extranjero
+ ventaja del extranjero ONPE ya contabilizado
- votos extranjeros pendientes estimados
```

Si esa ventaja sigue siendo positiva incluso asignando todo el extranjero pendiente a Sánchez, el modelo considera que Keiko ya no depende del extranjero pendiente.

La sección también revisa la composición territorial de las actas enviadas al JEE. Si la mayoría se concentra en territorios donde la proyección favorece a Keiko —por ejemplo Lima—, la página lo declara como refuerzo territorial del escenario.

Esta lectura no reemplaza la proclamación oficial de ONPE/JNE.

## Cambios frente al corte anterior

La página compara automáticamente el último corte válido contra el corte previo registrado en `data/history.json`.

Esta sección ayuda a revisar rápidamente:

```text
avance de actas contabilizadas
cambio del margen actual ONPE
cambio de la proyección Perú sin extranjero
incremento del voto extranjero contabilizado
variación del umbral extranjero
cambio de la diferencia final ajustada
calidad metodológica del corte: provincia completa o modelo híbrido con fallback
```

Esta comparación no reemplaza una auditoría por mesa o acta, pero funciona como control de consistencia entre cortes publicados.


### Archivo GeoJSON local recomendado

Para que el mapa no dependa de CDN externos, se recomienda subir al repositorio el archivo:

```text
data/peru_departamental_simple.geojson
```

El archivo usado en esta página fue tomado de **Highcharts Map Collection**, específicamente del mapa de Perú:

```text
countries/pe/pe-all.geo.json
```

Ese GeoJSON usa coordenadas proyectadas de mapa. Por eso el renderizado D3 usa `geoIdentity().reflectY(true)` cuando detecta un CRS proyectado, en lugar de `geoMercator()`, que solo corresponde a coordenadas longitud/latitud.

Si el archivo local no está en el repositorio, la página intentará cargar el mapa desde fuentes externas de respaldo:

```text
https://code.highcharts.com/mapdata/countries/pe/pe-all.geo.json
https://cdn.jsdelivr.net/gh/highcharts/map-collection-dist@master/countries/pe/pe-all.geo.json
```

Para mayor estabilidad, la versión publicada debe usar la copia local en:

```text
data/peru_departamental_simple.geojson
```


### Corrección de emparejamiento región-polígono

El mapa usa propiedades del GeoJSON de Highcharts como `name` / `woe-name` para emparejar cada polígono con la región ONPE correspondiente.

Se evita comparar contra valores vacíos del GeoJSON, porque eso podía hacer que todos los polígonos se vincularan accidentalmente con la primera región del JSON de datos.


## UX simplificado para lectura pública

La página separa la lectura pública de la auditoría técnica.

Se agregó una sección de **Lectura rápida** con el estado del escenario, diferencia ajustada, umbral extranjero y resumen territorial. Las tablas extensas quedan replegadas por defecto mediante bloques desplegables (`details/summary`), para que el mapa y la lectura principal no queden enterrados bajo tablas largas.

Se mantienen disponibles, pero plegadas:

```text
Prueba de sensibilidad
Cambios frente al corte anterior
Historial de cortes
Tabla provincial completa
Tabla regional complementaria
Descargas y auditoría
```

Esto conserva transparencia y auditabilidad, pero mejora la experiencia para lectores no técnicos.


## Carrera hacia la meta

La página incluye un visual dinámico tipo carrera con sprites pixel-art.

Assets incluidos:

```text
assets/race/track-bg.png
assets/race/keiko-run.png
assets/race/sanchez-run.png
```

La visualización se alimenta de `data/report-data.json`.

Reglas:

```text
avance hacia la meta = porcentaje de actas contabilizadas
separación entre corredores = diferencia ajustada entre candidatos
líder visual = candidato con ventaja ajustada positiva o negativa
```

La distancia visual entre corredores se amplifica moderadamente para que el margen sea legible en pantalla, pero el número exacto de votos y puntos porcentuales siempre se muestra en las tarjetas del componente.


### Refinamiento visual de la carrera

La separación visual entre corredores usa una escala amplificada para que una diferencia electoral pequeña siga siendo visible en pantalla.

La fórmula actual mantiene los datos reales en las tarjetas superiores y solo amplifica la distancia visual:

```text
separación visual = margen ajustado real × escala visual
```

Además, los carriles fueron separados verticalmente para evitar que los sprites y etiquetas se superpongan en móvil.


## Conclusión pública dinámica

La página incorpora una conclusión pública automática en la lectura principal y en el estado del escenario.

Cuando se cumplen simultáneamente estas condiciones:

```text
Keiko lidera el conteo ONPE actual
el umbral extranjero ya está superado
la ventaja extrema ante extranjero pendiente sigue siendo positiva
la diferencia ajustada favorece a Keiko
```

la página muestra:

```text
Bajo el modelo publicado, el escenario de victoria de Keiko está matemáticamente consolidado.
```

La misma caja mantiene la advertencia de que esta lectura no reemplaza la culminación formal del cómputo ni la proclamación oficial de las autoridades electorales. Si hay fallback departamental, la conclusión conserva la nota metodológica correspondiente.


## Versión final editorial

Esta versión reorganiza la página como dashboard final compacto:

```text
1. Hero con conclusión pública y métricas clave
2. Resumen ejecutivo en una pantalla
3. Carrera hacia la meta
4. Mapa territorial
5. Evolución completa de cortes válidos
6. Prueba extrema del extranjero pendiente
7. Auditoría técnica plegada
8. Descargas
```

Cambios principales:

- Menú reducido a secciones esenciales.
- Historial completo de cortes visibles mediante línea de tiempo y gráfico de evolución.
- Tablas pesadas plegadas por defecto.
- Metodología resumida y auditoría técnica concentrada.
- Mejoras responsive para desktop, tablet y móvil.
- Fix aplicado: los sprites de la carrera usan `left: var(--runner-x)` para moverse en la escala real de la pista.

Esta actualización no incluye `data/report-data.json` para evitar sobrescribir el último corte publicado. Mantén tus archivos de datos actuales y sube solo los archivos de UI incluidos en el ZIP final.


### Fix final de contraste

Se añadió una capa de CSS para mejorar el contraste de títulos, labels y encabezados dentro de fondos oscuros.

Problema corregido:

```text
Algunos títulos y labels heredaban color oscuro sobre tarjetas oscuras.
```

Solución:

```text
Forzar títulos/strong/b/summary a tonos claros dentro de secciones oscuras.
Mantener texto oscuro en tarjetas blancas internas para no romper la auditoría.
```



### Fix de legibilidad e historial interactivo

Cambios incluidos:

```text
1. Se reforzó el contraste del texto secundario en secciones con fondo blanco.
2. Se corrigieron encabezados de acordeón dentro de auditoría técnica sobre fondo oscuro.
3. La métrica "Sánchez +..." fue reemplazada por "Cambio del margen", para evitar confundir una variación histórica con el ganador actual.
4. La gráfica de evolución ahora permite seleccionar cortes: al tocar un punto o una tarjeta, se resalta el corte correspondiente y se muestra su detalle.
```



### Fix final 2 de contraste interno

Se corrigieron los casos restantes donde algunos textos seguían demasiado tenues:

```text
- Panel del umbral extranjero.
- Tabla de comparación contra el umbral.
- Caja verde de lectura del umbral.
- Cajas internas de actualización/fallback dentro de auditoría técnica.
- Metodología resumida en tarjetas blancas.
```

La causa era que reglas de contraste pensadas para fondos oscuros estaban afectando elementos internos con fondo blanco. El fix añade reglas más específicas para que los paneles blancos usen texto oscuro y legible.



### Fix final 3 de tabla completa de cortes

Se reforzó el contraste de la tabla completa del historial de cortes:

```text
- Encabezados de tabla más oscuros.
- Celdas con texto principal oscuro.
- Filas alternadas y hover más legibles.
- Colores específicos para ventajas Keiko/Sánchez.
- Etiquetas responsivas visibles en móvil.
```

Este cambio solo afecta la tabla `#historyTable` dentro de la sección de evolución.



### Fix final 4 de tabla de cortes y cache CSS

Se agregó un cache-buster al `index.html`:

```html
<link rel="stylesheet" href="style.css?v=final-table-contrast-2">
```

Esto fuerza al navegador a descargar el nuevo CSS. Además, se añadieron reglas ultra específicas para `section#historial table#historyTable` con:

```text
opacity: 1
filter: none
mix-blend-mode: normal
texto oscuro forzado en Corte / Actas / Fuente / Calidad
colores específicos para ventajas Keiko/Sánchez
```

Este fix requiere reemplazar también `index.html`, no solo `style.css`, porque el problema puede mantenerse por caché del archivo CSS.



### Actualización editorial final: victoria virtual consolidada

Se ajustaron los textos dinámicos para cortes casi finales:

```text
- Si las actas superan 99.5% y el extranjero pendiente estimado es <= 1,500 votos,
  el tablero pasa a hablar de "victoria virtual consolidada bajo el modelo".
- Se reduce el énfasis en Datum cuando el extranjero pendiente ya es marginal.
- Se agrega una lectura territorial: Perú sin extranjero puede seguir favoreciendo a Sánchez,
  pero la ventaja extranjera ONPE ya contabilizada compensa ese margen.
- Se mantiene la advertencia de que no es proclamación oficial.
```



### Actualización editorial 99.990%

Se ajustaron textos para cortes prácticamente finales:

```text
- "Diferencia ajustada Datum" pasa a "Diferencia total casi final" cuando el extranjero pendiente es marginal.
- El encabezado deja de hablar de "escenario extranjero Datum" y pasa a "ONPE casi final + remanente extranjero marginal".
- El bloque extranjero deja de presentarse como un umbral relevante y se muestra como remanente marginal.
- Se mantiene la lectura: Perú sin extranjero favorece a Sánchez, pero el extranjero ONPE ya contado compensa ampliamente y sostiene la ventaja total de Keiko.
```



### Actualización editorial 100%

Se corrigió el comportamiento cuando el extranjero pendiente llega a cero:

```text
- El 100% de actas ya se trata como conteo cerrado, no como escenario pendiente.
- Se elimina la lectura incorrecta de que Keiko "no alcanza la condición más fuerte".
- La conclusión pública pasa a: resultado ONPE al 100% con ventaja total de Keiko.
- Datum queda como referencia histórica y ya no participa en el cálculo principal.
- Se mantiene la precisión: Perú sin extranjero favorece a Sánchez, pero el extranjero ONPE contabilizado sostiene la ventaja total de Keiko.
```
