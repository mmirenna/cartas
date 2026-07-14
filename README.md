# Cartas digitales

Google Sheets → Apps Script → JSON en este repo → GitHub Pages.
La web es 100% estática: no lee la planilla en vivo, lee el JSON que se publicó.

```
index.html                  selector de cartas
carta/<carta_id>/           una página por carta (la genera el script al publicar)
assets/css/menu.css         base + un tema por carta
assets/js/menu.js           render, buscador, idiomas
assets/img/logos/           logos (uno por carta)
assets/img/secciones/       fotos de portada de cada sección
data/<carta_id>.json        lo escribe Apps Script al publicar
data/index.json             lista de cartas
apps-script/Codigo.gs       validar + publicar + aumentos + fotos
```

## Puesta en marcha (una vez)

1. **Repo**: creá `cartas` en GitHub, subí todo esto, y activá Pages en
   Settings ▸ Pages ▸ Branch `main` / `/ (root)`.
   Queda en `https://<usuario>.github.io/cartas/`.

2. **Planilla**: importá `Cartas_AABB.xlsx` a Google Sheets
   (Archivo ▸ Importar ▸ Subir ▸ Reemplazar hoja de cálculo).

3. **Token**: GitHub ▸ Settings ▸ Developer settings ▸ Personal access tokens ▸
   Fine-grained. Repositorio: solo `cartas`. Permiso: **Contents → Read and write**.
   Copiá el token.

4. **Script**: en la planilla, Extensiones ▸ Apps Script. Pegá `apps-script/Codigo.gs`.
   En Configuración del proyecto ▸ Propiedades del script, agregá:

   | Propiedad | Valor |
   |---|---|
   | `GITHUB_OWNER` | tu usuario de GitHub |
   | `GITHUB_REPO` | `cartas` |
   | `GITHUB_BRANCH` | `main` |
   | `GITHUB_TOKEN` | el token del paso 3 |
   | `DRIVE_FOTOS` | (opcional) id de la carpeta de Drive con las fotos |

5. Recargá la planilla: aparece el menú **Cartas**.

6. **QR**: uno por carta, apuntando a `https://<usuario>.github.io/cartas/carta/lobby-bar/`.
   La URL no cambia nunca aunque cambien los precios: el QR se imprime una sola vez.

## Operación diaria

| Necesito… | Hago |
|---|---|
| Cambiar un precio | Hoja `precios` → edito la celda de esa carta → **Cartas ▸ Publicar** |
| Sacar un producto de una carta | Borro el precio en la columna de esa carta. Vacío = no aparece |
| Agregar un producto | Fila en `productos` + su precio en `precios` |
| Crear una carta nueva | Fila en `cartas` + sus filas en `secciones` + la columna nueva en `precios` |
| Aumento de comidas | Cargo los nuevos en `pendientes_comidas` → **Cartas ▸ Aplicar aumentos de comidas** → Publicar |
| Aumento de bebidas | Cargo los nuevos en `pendientes_bebidas` → **Cartas ▸ Aplicar aumentos de bebidas** → Publicar |
| Cambiar una foto de sección | Reemplazo el archivo en Drive → **Cartas ▸ Sincronizar fotos** |

## Reglas de la hoja `precios`

- Un número mayor a 0 = el producto está en esa carta a ese precio.
- Celda **vacía** = el producto no está en esa carta.
- La única palabra permitida es `CONSULTAR`.
- Nunca escribir `NO`, `NA`, `0` ni guiones: el validador rechaza la publicación.

## Lo que hace Publicar

1. Valida (IDs duplicados, precios inválidos, productos sin sección declarada).
   Si hay un error, **no publica**.
2. Muestra cuántos productos queda con cada carta y **avisa si alguna bajó**
   respecto de la última publicación. Es la red contra el borrado accidental.
3. Escribe los JSON y las páginas en el repo. La web se actualiza en 30–60 segundos.

Como todo queda commiteado en git, volver atrás es revertir un commit.

## Idiomas

`es` es el idioma base y vive en `productos`. `en` y `pt` van en la hoja `traducciones`
(solo las filas que existan). Si un producto no tiene traducción, se muestra en español.
El selector de idioma aparece solo si la carta declara más de uno en `cartas.idiomas`.

## Aumentos

Comidas y bebidas se actualizan por separado, con su propia hoja de pendientes y su propio
botón. `pendientes_comidas` tiene solo las 179 comidas y `pendientes_bebidas` solo las 222
bebidas: el que carga no scrollea por productos que no le tocan.

El botón:

1. Rechaza todo si hay un precio inválido, o si un producto está en la hoja de pendientes
   equivocada (una bebida cargada en comidas, por ejemplo). No aplica nada a medias.
2. Muestra los primeros 12 cambios (`producto / carta: 43.000 → 47.000`) y pide confirmar.
3. Escribe los nuevos precios, registra cada cambio en `historial_precios` y vacía la hoja
   de pendientes.

Una celda pendiente vacía nunca pisa un precio vigente. El aumento no se ve en la web hasta
que apretás **Publicar**.
