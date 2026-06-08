# Informe ONPE + escenario extranjero Datum

Sitio web estático listo para publicar en GitHub Pages, Cloudflare Pages o Firebase Hosting.

## Archivos principales

- `index.html`: página principal.
- `style.css`: estilos responsive.
- `app.js`: renderiza tarjetas, tablas y escenario de sensibilidad.
- `data/report-data.json`: datos usados por la página.
- `data/regions.csv`: detalle regional en CSV.
- `.nojekyll`: evita procesamiento Jekyll en GitHub Pages.

## Publicar en GitHub Pages

1. Crea un repositorio público en GitHub, por ejemplo `reporte-onpe-datum`.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Branch: `main`; folder: `/root`.
6. Guarda y espera a que GitHub genere la URL.

La URL quedará parecida a:

```text
https://TU_USUARIO.github.io/reporte-onpe-datum/
```

## Actualizar datos

Para actualizar el informe, reemplaza `data/report-data.json` con una nueva versión generada desde Colab y vuelve a subir el archivo al repositorio.

## Advertencia metodológica

Este sitio presenta un escenario analítico. Los datos oficiales son los publicados por ONPE/JNE. El escenario extranjero Datum se usa como simulación y no reemplaza la proclamación oficial.
