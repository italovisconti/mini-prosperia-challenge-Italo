# Mini-Prosperia – Challenge (OCR + IA)

## Implementaciones realizadas

1) **OCR con Tesseract (obligatorio)**
   Se hace uso de la libreria [Tesseract.js](https://www.npmjs.com/package/tesseract.js) para reconocer caracteres en los documentos enviados.

   - **Uso de PDFs con Tesseract.js**: Tesseract.js no permite procesar PDFs de manera directa, por lo que se convierten todos los documentos de tipo PDF a imagen antes de ser procesados. Para esto se utiliza la libreria [pdf2pic](https://www.npmjs.com/package/pdf2pic) mediante la creacion de un servicio de conversión.

   - **Preprocesamiento de Imagenes**
   Se implementaron las tecnicas mas comunes de preprocesamiento de imagenes para aumentar la precision del OCR.
   Los pasos a seguir son:
      1. Invertir Imagen.
      2. Convertir a Escala de Grises.
      3. Reducción de Ruido (Mediana).
      4. Binarización de Imagen con Umbralización adaptativa (Otsu).
      [Fuente](https://www.youtube.com/watch?v=ADV-AjAXHdc)

      - **Preprocesamiento con Sharp**
      Se utiliza la librería [Sharp](https://www.npmjs.com/package/sharp) para realizar operaciones de preprocesamiento en las imágenes. Esta implementación se llevó a cabo con apoyo de IA.

      - **Preprocesamiento con Canvas**
      Se utiliza la librería [canvas](https://www.npmjs.com/package/canvas) para realizar operaciones de preprocesamiento en las imágenes.
      La implementación fue obtenida de: [dev.to](https://dev.to/mathewthe2/using-javascript-to-preprocess-images-for-ocr-1jc)
      El preprocesamiento implementado con canvas fue comentado y no se utilizó en la implementación final.

      - **Consideraciones**
      También se puede usar [OpenCV](https://opencv.org/) para el preprocesamiento de imágenes, este parece ser un método más común.

      - **IMPORTANTE**
      No hubo aumento de precision al probar el preprocesamiento con ninguna de las dos implementaciones, por lo tanto es **recomendable** utilizar su mock para saltar esta etapa. `PRE_PROCESS_PROVIDER=mock`

   - **Configuracion del Worker de Tesseract**: Se configura el worker de Tesseract para que utilice los idiomas adecuados (Español e Inglés), pero también se agrega `osd` para la detección de orientación y lenguaje del documento. Tesseract.js utiliza data pre-entrenada para mejorar la precisión del reconocimiento, existen varios repositorios con modelos entrenados disponibles, pero esta libreria utiliza los mejores modelos disponibles.
   También se usa Tesseract con una whitelist de caracteres permitidos para mejorar la precisión.
   `tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑüÜ%:.,-$'`

2) **Estructuración y/o parsing de campos**
   Una vez obtenido el texto crudo del documento se procede a estructurarlo y extraer los campos relevantes, si bien esto se puede lograr utilizando expresiones regulares, también se puede implementar un modelo de IA que ayude a identificar y clasificar la información de manera más precisa.

   - **Configuracion del Modelo de IA**: Utilizando gpt-4o-mini como modelo, se realizaron configuraciones específicas para mejorar la extracción de información. La mas importante fue el uso del output estructurado para guiar al modelo con los campos esperados junto a la descripcion de cada uno. Se bajo un poco la temperatura, reduciendo levemente la "creatividad" del modelo.

3) **Categorización con OpenAI usando el Relay**
   Por ultimo, categorizamos los recibos, como datos de entrada se usan los `accounts` existentes en la base de datos, el nombre del vendedor obtenido en el paso anterior, y el texto crudo del OCR.

   - **Configuracion del Modelo de IA**: Se utiliza el mismo modelo que para la estructuración, se aplican configuraciones similares, incluyendo el uso de output estructurado con la lista de IDs de `accounts`. Se aumenta levemente la temperatura.

4) **Cálculo de campos faltantes**
   Como herramienta de fallback, se implementa un servicio que permite calcular los campos numéricos principales cuando no se detectan directamente en el OCR o parsing. Los campos involucrados son:

   - **Monto total** (`amount`)
   - **Subtotal** (`subtotalAmount`)
   - **Impuesto** (`taxAmount`)
   - **Porcentaje de impuesto** (`taxPercentage`)

   Se hacen cálculos básicos para completar los valores faltantes y asegurar la persistencia de todos los campos requeridos.

5) **Persistencia de datos**
   Todos los datos obtenidos persisten en la base de datos, especificamente en las tablas `Receipts`, `Transactions`, `Vendor` y `vendorIdentifications`.

   - **Creacion de Vendors**: se implementa un servicio que permite crear nuevos vendors a partir de nuevas identificaciones obtenidas en el Documento. En caso de que estos ya existan, se actualizan.

6) **UI**
   Se implementa una interfaz de usuario simple que permite a los usuarios subir imágenes o PDFs y ver la transacción desglosada. La UI se basa en un formulario en `/public/index.html`.

   ![UI Screenshot](https://github.com/user-attachments/assets/9e2cb643-7130-41fd-97c3-a14b49b2e241)

7) **Logging**
   Se implementa un sistema de logging usando la libreria [Pino](https://www.npmjs.com/package/pino)

   - **Logs Rotativos y Persistencia**
   Junto con [pino-roll](https://www.npmjs.com/package/pino-roll) se configura un log rotativo para lograr persistencia. Los logs se guardan en la carpeta `./logs` y se rotan diariamente o cuando alcanzan un tamaño máximo de 20MB.

   - **Decorador de Metodos**
   Se implementa un decorador de metodos para agregar logs de entrada y salida a los metodos de los servicios.

8) **Docker**
   Se crea un nuevo archivo `docker-compose.production.yml` para definir los servicios y configuraciones necesarias para el entorno de producción.
   Servicios:

   - **db**: Contenedor de la base de datos PostgreSQL. Se expone el puerto 5432 (para pruebas)
   - **server**: Contenedor de la aplicación.  La migración y seed de la base de datos se realiza automáticamente al iniciar el contenedor. Se expone el puerto 3000. Se hace bind a la carpeta `./logs` para persistencia de logs.

## Diagrama de Flujo

   [Disponible en Drive](https://drive.google.com/file/d/1bei-hDz6V2hjabtRqzD_5__VyL0GTXuI/view?usp=sharing)

## Correr localmente con Docker

   Una vez clonado el repositorio puedes:

   ```bash
   cp .env.example .env
   npm run compose-prod:up
   ```

## Correr localmente (sin Docker)

   ```bash
   cp .env.example .env
   npm i
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run build
   npm run start
   ```

# Planteamiento

**Objetivo:** a partir de un recibo (PDF o imagen) extraer y persistir **toda** esta información:

- **Total** (`amount`)
- **Subtotal** (`subtotalAmount`)
- **Impuesto** (`taxAmount`)
- **% de impuesto** (`taxPercentage`)
- **Vendor name**
- **Vendor identifications** (RUC/NIT/CIF u otros)
- **Categorizar automáticamente** el gasto a una **cuenta contable** (`Account`)

**Bonus:** una **UI** simple para subir la imagen/PDF y ver la transacción desglosada (hay un form base en `/public/index.html`).

---

## 🔧 Lo que debes implementar (claves marcadas con `TODO` en el código)

1) **OCR con Tesseract (obligatorio)**
   - Implementa el provider de Tesseract en `src/services/ocr/*` para extraer `rawText` desde una imagen/PDF.
   - Sugerencia: idioma `eng+spa`.

2) **Estructuración y/o parsing de campos**
   - Detecta y llena: `amount`, `subtotalAmount`, `taxAmount`, `taxPercentage`, `date`, `invoiceNumber`, `vendorName`, `vendorIdentifications` (RUC/NIT/CIF).
   - Puedes combinar **reglas** + **IA** para mejorar exactitud.

3) **Categorización con OpenAI usando el Relay (obligatorio para la categoría)**
   - Llama al **relay** (endpoint HTTP) para obtener la **categoría contable** recomendada a partir del texto del recibo y/o vendor.
   - Integra el resultado asignando un `accountId` existente (usa las cuentas del seed).

> En el repo hay heurísticas base y stubs de IA. Los puntos exactos a tocar están marcados con `// TODO:` en módulos de **OCR**, **AI** y **parsing/categorization**.

---

## 🚀 Setup rápido

```bash
cp .env.example .env
npm i
npm run compose:up           # o usa Postgres local si no tienes Docker
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- API: `http://localhost:3000`
- UI:  `http://localhost:3000/` (form para subir)

### Endpoints
- `POST /api/receipts` (form-data con `file`)
- `GET /api/receipts/:id`
- `POST /api/receipts/:id/reparse`
- `POST /api/transactions` (ejemplo de CRUD base)

---

## 🧠 Proveedores

- **OCR**: `tesseract` (**obligatorio implementarlo**). También existe `mock` para pruebas.
- **IA**:
  - `mock` (gratis) — funciona sin costos.
  - **OpenAI vía Relay** (recomendado para categorización):
    - No necesitas una API key propia.
    - Usa el **relay** provisto y tu **token** para las llamadas.

### Configuración para usar el Relay (OpenAI)

En tu `.env` del challenge define:

```
AI_PROVIDER=openai
OPENAI_BASE_URL=https://prosperia-openai-relay-production.up.railway.app
PROSPERIA_TOKEN=nombre-apellido
```

- `PROSPERIA_TOKEN` será tu **token de acceso** al relay y **es tu nombre-apellido** (por ejemplo: `andres-prato`).
- El cliente del challenge enviará las requests a:
  - `POST ${OPENAI_BASE_URL}/openai/chat`
  - Header requerido: `X-Prosperia-Token: ${PROSPERIA_TOKEN}`
- **Importante:** La API key real de OpenAI vive en el relay (servidor).
- Utiliza el Relay para poder usar gpt-4o-mini a tu disposición para el challenge

---

## ✅ Criterios de evaluación

1. **Exactitud** de los campos extraídos: `amount`, `subtotalAmount`, `taxAmount`, `taxPercentage`, `vendorName`, `vendorIdentifications`.
2. **Categorización automática**: correcto mapeo a un `Account` existente (vía relay + OpenAI).
3. **Calidad del código** (TypeScript), manejo de errores y DX (logs, validaciones, mensajes).
4. **Persistencia**: Prisma + migraciones + seeds funcionando.
5. **Bonus**: UI funcional, tests, Docker (opcional).

---

## 🧪 Cómo probaremos (resumen)

- Subiremos varias imágenes/PDF a `POST /api/receipts`.
- Veremos el JSON persistido y los campos detectados.
- Verificaremos que se asigna una **categoría contable** válida.
- (Si hay UI) Subiremos un archivo desde `/` y validaremos el desglose.

----