const form = document.getElementById('f');
const out = document.getElementById('out');
const alertBox = document.getElementById('alert');
const btnUpload = document.getElementById('btnUpload');
const btnReset = document.getElementById('btnReset');
const spinner = btnUpload.querySelector('.spinner-border');
const dropOverlay = document.getElementById('dropOverlay');

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        m
      ]
  );
const formatMoney = (n, c) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: c || 'USD'
    }).format(Number(n));
  } catch {
    return Number(n).toFixed(2);
  }
};
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-ES');
  } catch {
    return iso;
  }
};
const formatSize = (bytes) => {
  if (bytes === 0 || bytes == null) return '—';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

btnReset.addEventListener('click', () => {
  form.reset();
  alertBox.innerHTML = '';
  out.innerHTML = '';
});

// --- Drag & Drop (full-page) ---
let dragCounter = 0;
const showOverlay = () => dropOverlay.classList.remove('d-none');
const hideOverlay = () => dropOverlay.classList.add('d-none');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

window.addEventListener('dragenter', (e) => {
  dragCounter++;
  // show only if there are files in the drag operation
  const hasFiles = Array.from(e.dataTransfer?.types || []).includes('Files');
  if (hasFiles) showOverlay();
});

window.addEventListener('dragover', () => {
  // keep visible while dragging
  showOverlay();
});

window.addEventListener('dragleave', (e) => {
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) hideOverlay();
});

window.addEventListener('drop', async (e) => {
  hideOverlay();
  dragCounter = 0;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // Only take the first file (backend expects single file)
  const [file] = files;
  const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
  if (allowed.length && !allowed.includes(file.type) && !/\.(png|jpe?g|pdf)$/i.test(file.name)) {
    alertBox.innerHTML = '<div class="alert alert-warning" role="alert">Formato no soportado. Usa PNG, JPG o PDF.</div>';
    return;
  }

  // Put dropped file into the form input to reuse existing flow
  const input = form.querySelector('input[type="file"][name="file"]');
  try {
    // Some browsers allow setting files via DataTransfer for inputs
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  } catch {
    // Fallback: we still submit manually with FormData below
  }

  // Reuse submit logic
  btnUpload.disabled = true;
  spinner.classList.remove('d-none');
  alertBox.innerHTML = '';
  out.innerHTML = '';

  try {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const res = await fetch('/api/receipts', { method: 'POST', body: fd });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = await res.json();
    renderResult(data);
    alertBox.innerHTML =
      '<div class="alert alert-success alert-dismissible fade show" role="alert">Procesado correctamente.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-danger" role="alert">Error al procesar: ${esc(err.message || err)}</div>`;
  } finally {
    btnUpload.disabled = false;
    spinner.classList.add('d-none');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  out.innerHTML = '';
  btnUpload.disabled = true;
  spinner.classList.remove('d-none');
  try {
    const fd = new FormData(form);
    const res = await fetch('/api/receipts', { method: 'POST', body: fd });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = await res.json();
    renderResult(data);
    alertBox.innerHTML =
      '<div class="alert alert-success alert-dismissible fade show" role="alert">Procesado correctamente.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-danger" role="alert">Error al procesar: ${esc(err.message || err)}</div>`;
  } finally {
    btnUpload.disabled = false;
    spinner.classList.add('d-none');
  }
});

function renderResult(d) {
  const j = d.json || {};
  const items = Array.isArray(j.items) ? j.items : [];
  const vendorIds = Array.isArray(j.vendorIdentifications)
    ? j.vendorIdentifications
    : [];
  const payMap = {
    CARD: 'Tarjeta',
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    OTHER: 'Otro'
  };
  const typeBadge = j.type === 'income' ? 'success' : 'warning';

  // Clone
  const template = document.getElementById('resultTemplate');
  const clone = template.cloneNode(true);
  clone.id = 'currentResult';
  clone.classList.remove('d-none');

  // fill basic data
  clone.querySelector('#typeBadge').textContent = j.type || '—';
  clone.querySelector('#typeBadge').className = `badge text-bg-${typeBadge}`;
  clone.querySelector('#currencyBadge').textContent = j.currency || 'USD';
  clone.querySelector('#fileName').textContent = d.originalName || 'Recibo';
  clone.querySelector('#fileId').textContent = d.id || '—';
  clone.querySelector('#totalAmount').textContent = formatMoney(
    j.amount,
    j.currency
  );

  // Fill details
  clone.querySelector('#receiptDate').textContent = j.date || '—';
  clone.querySelector('#createdAt').textContent = formatDate(d.createdAt);
  clone.querySelector('#subtotal').textContent = formatMoney(
    j.subtotalAmount,
    j.currency
  );
  clone.querySelector('#taxAmount').textContent = formatMoney(
    j.taxAmount,
    j.currency
  );
  clone.querySelector('#taxPercentage').textContent = j.taxPercentage ?? '—';
  clone.querySelector('#vendorName').textContent = j.vendorName || '—';
  clone.querySelector('#vendorId').textContent = j.vendorId
    ? `(id ${j.vendorId})`
    : '';
  clone.querySelector('#invoiceNumber').textContent = j.invoiceNumber ?? '—';
  clone.querySelector('#paymentMethod').textContent = j.paymentMethod
    ? payMap[j.paymentMethod] || j.paymentMethod
    : '—';
  clone.querySelector('#category').textContent = j.category ?? '—';
  clone.querySelector('#ocrProvider').textContent = d.ocrProvider || '—';
  clone.querySelector('#aiProvider').textContent = d.aiProvider || '—';
  clone.querySelector('#fileSize').textContent = formatSize(d.size);

  // Fill vendor identifications
  if (vendorIds.length > 0) {
    const vendorSection = clone.querySelector('#vendorIdentifications');
    const vendorList = clone.querySelector('#vendorIdsList');
    vendorSection.classList.remove('d-none');
    vendorList.innerHTML = vendorIds
      .map(
        (v) =>
          `<span class="badge rounded-pill text-bg-secondary">${esc(v.type)}: ${esc(v.value)}</span>`
      )
      .join('');
  }

  // Fill items
  if (items.length > 0) {
    const itemsTable = clone.querySelector('#itemsTable');
    const itemsCount = clone.querySelector('#itemsCount');
    const itemsBody = clone.querySelector('#itemsTableBody');

    itemsTable.classList.remove('d-none');
    itemsCount.textContent = items.length;
    itemsBody.innerHTML = items
      .map(
        (it) => `
            <tr>
              <td>${esc(it.description)}</td>
              <td class="text-end">${esc(it.quantity)}</td>
              <td class="text-end">${formatMoney(it.unitPrice, j.currency)}</td>
              <td class="text-end">${formatMoney(it.total, j.currency)}</td>
            </tr>
          `
      )
      .join('');
  }

  // const rawText = esc(d.rawText || j.rawText || '');
  // clone.querySelector('#rawText').innerHTML =
  //   rawText || '<span class="text-body-secondary">(vacío)</span>';
  clone.querySelector('#jsonText').textContent = JSON.stringify(d, null, 2);

  const btnCopy = clone.querySelector('#btnCopy');
  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(d, null, 2));
      btnCopy.textContent = 'Copiado!';
      setTimeout(() => (btnCopy.textContent = 'Copiar JSON'), 1500);
    } catch {}
  });

  out.innerHTML = '';
  out.appendChild(clone);
}
