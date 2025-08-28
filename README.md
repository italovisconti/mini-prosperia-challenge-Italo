# Mini-Prosperia – Challenge (OCR + IA)

**Objetivo:** a partir de un recibo (PDF o imagen) extraer y persistir **toda** esta información:

Explicaciones de Italo

---

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