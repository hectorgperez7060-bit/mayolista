import { useState } from 'react';
import { Upload, RefreshCw, PlusCircle } from 'lucide-react';
import { useStore } from '../store';

// Encuentra la fila que más parece un header (strings cortos, no fechas, no vacía)
function findHeaderRowIndex(rawRows) {
  let bestIdx = 0;
  let bestScore = -1;
  rawRows.slice(0, 15).forEach((row, idx) => {
    const score = row.filter(v => {
      if (!v && v !== 0) return false;
      const s = String(v).trim();
      if (!s) return false;
      // Penalizar fechas y números
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return false;
      if (/^\d+([.,]\d+)?$/.test(s)) return false;
      return s.length >= 2 && s.length <= 40;
    }).length;
    if (score > bestScore) { bestScore = score; bestIdx = idx; }
  });
  return bestIdx;
}

// Puntaje de qué tan probable es cada columna para cada rol
function scoreColumns(headers, sampleRows) {
  return headers.map((h, colIdx) => {
    const vals = sampleRows.map(r => r[colIdx]).filter(v => v !== '' && v != null);
    const hL = String(h).toLowerCase();

    const isDateOrEmpty = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(String(h)) ||
      hL === '__empty' || hL.startsWith('unnamed') || !hL.trim();

    if (isDateOrEmpty) return { h, codeScore: -99, descScore: -99, priceScore: -99 };

    const numericVals = vals.filter(v => {
      const n = parseFloat(String(v).replace(/[,$ ]/g, '').replace(',', '.'));
      return !isNaN(n) && n > 0;
    });
    const shortVals = vals.filter(v => String(v).length > 0 && String(v).length <= 20);
    const longVals = vals.filter(v => typeof v === 'string' && v.length > 8);

    let codeScore = 0, descScore = 0, priceScore = 0;

    // Por nombre de columna (pesos altos — son señales fuertes)
    if (/c[oó]d|sku|ref\b|art[ií]c|item/.test(hL)) codeScore += 15;
    if (/desc|nombre|produc|articu|detal|mercader/.test(hL)) descScore += 15;
    if (/prec.*uni|p\.unit|p\.u\b|pvp|\$ u|unit.*prec/.test(hL)) priceScore += 15;
    if (/prec/.test(hL) && !/total|dto|desc|bonif|may|min|max|lista/.test(hL)) priceScore += 5;
    // Precio promedio/vigente/actual son buenos candidatos si no hay precio unitario
    if (/prom|vigent|actual|venta/.test(hL) && /prec/.test(hL)) priceScore += 8;

    // Por contenido de datos
    codeScore  += shortVals.length * 0.4;
    descScore  += longVals.length  * 0.6;
    priceScore += numericVals.length * 0.8;

    // Penalizaciones
    if (/total|subtotal/.test(hL))      priceScore -= 10;
    if (/dto|desc|bonif|bon\b/.test(hL)) priceScore -= 8;
    if (/cant|qty|stock|bulto/.test(hL)) { priceScore -= 6; codeScore -= 2; }
    if (numericVals.length > vals.length * 0.8) { codeScore -= 5; descScore -= 5; }
    // Si la columna tiene valores muy largos no es código
    if (longVals.length > vals.length * 0.5) codeScore -= 4;

    return { h, codeScore, descScore, priceScore };
  });
}

// Elige el mejor para cada rol sin repetir columnas entre roles
function pickBestUnique(scores) {
  const pick = (role, exclude = []) => {
    const key = `${role}Score`;
    const filtered = scores.filter(s => !exclude.includes(s.h));
    if (!filtered.length) return '';
    return filtered.reduce((best, s) => s[key] > best[key] ? s : best, { [key]: -1, h: '' }).h;
  };
  const precio     = pick('price');
  const codigo     = pick('code',  [precio]);
  const descripcion = pick('desc', [precio, codigo]);
  return { codigo, descripcion, precio };
}

function getSamples(rows, headers, colName, n = 3) {
  const idx = headers.indexOf(colName);
  if (idx < 0) return '';
  return rows.slice(0, n).map(r => r[idx]).filter(Boolean).join(', ');
}

function parsePrice(v) {
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^0-9,.-]/g, '').replace(',', '.');
  return parseFloat(s);
}

export default function ImportCatalog({ onClose }) {
  const products = useStore(state => state.products);
  const bulkUpsertProducts = useStore(state => state.bulkUpsertProducts);

  const [data, setData] = useState([]); // rows as arrays
  const [headers, setHeaders] = useState([]);
  const [mapped, setMapped] = useState({ codigo: '', descripcion: '', precio: '' });
  const [replaceAll, setReplaceAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        // Elegir la hoja con más filas de datos (no siempre la primera)
        let bestSheet = wb.Sheets[wb.SheetNames[0]];
        let bestCount = 0;
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
          if (rows.length > bestCount) { bestCount = rows.length; bestSheet = wb.Sheets[name]; }
        });
        const rawRows = XLSX.utils.sheet_to_json(bestSheet, { header: 1, defval: '' });

        const hIdx = findHeaderRowIndex(rawRows);
        const hdrs = rawRows[hIdx].map((h, i) => (String(h).trim() || `Col_${i + 1}`));
        const dataRows = rawRows.slice(hIdx + 1).filter(r => r.some(v => v !== ''));

        setHeaders(hdrs);
        setData(dataRows);

        const scores = scoreColumns(hdrs, dataRows.slice(0, 30));
        const auto = pickBestUnique(scores);
        setMapped(auto);
      } catch (err) {
        alert('Error al leer el archivo.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = () => {
    if (!mapped.codigo || !mapped.descripcion || !mapped.precio) {
      return alert('Seleccioná las 3 columnas requeridas.');
    }

    const ciCod = headers.indexOf(mapped.codigo);
    const ciDesc = headers.indexOf(mapped.descripcion);
    const ciPric = headers.indexOf(mapped.precio);

    let added = 0, updated = 0, skipped = 0;
    const formatted = [];

    data.forEach(row => {
      const cod = String(row[ciCod] ?? '').trim();
      const desc = String(row[ciDesc] ?? '').trim();
      const price = parsePrice(row[ciPric]);

      if (!cod || !desc || isNaN(price) || price <= 0) { skipped++; return; }

      const exists = products.find(p => p.code === cod);
      exists ? updated++ : added++;
      formatted.push({ codigo: cod, descripcion: desc, precio: price });
    });

    if (replaceAll) {
      useStore.setState({ products: [] });
      useStore.getState().setPendingPurge(true);
    } else {
      useStore.getState().setPendingPurge(false);
    }

    bulkUpsertProducts(formatted);
    setResult({ added, updated, skipped, total: formatted.length, replaced: replaceAll });
  };

  if (result) {
    return (
      <div className="glass-panel p-4 mb-4 animate-slide-up" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
        <h3 className="text-xl font-bold" style={{ color: 'var(--success)', marginBottom: '1rem' }}>
          {result.replaced ? 'Catálogo reemplazado' : 'Catálogo actualizado'}
        </h3>
        <div className="glass-panel p-3 mb-4" style={{ textAlign: 'left' }}>
          <div className="flex-between mb-2">
            <span className="text-muted">Productos importados</span>
            <span className="font-bold text-primary text-lg">{result.total}</span>
          </div>
          {!result.replaced && (
            <>
              <div className="flex-between mb-2">
                <span className="text-muted">Nuevos</span>
                <span className="font-bold" style={{ color: 'var(--success)' }}>{result.added}</span>
              </div>
              <div className="flex-between mb-2">
                <span className="text-muted">Actualizados</span>
                <span className="font-bold text-primary">{result.updated}</span>
              </div>
            </>
          )}
          {result.skipped > 0 && (
            <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <span className="text-muted">Filas omitidas</span>
              <span className="font-bold text-danger">{result.skipped}</span>
            </div>
          )}
        </div>
        <button className="btn btn-primary w-full" onClick={onClose}>Listo</button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 mb-4 animate-slide-up">
      <h2 className="text-xl mb-1 text-primary font-bold">Importar Catálogo</h2>

      {!data.length ? (
        <div className="flex flex-col gap-3">

          {products.length > 0 ? (
            <>
              <p className="text-sm text-muted">
                Tenés <strong style={{ color: 'var(--primary)' }}>{products.length} productos</strong> en el catálogo actual.
                ¿Qué querés hacer con la nueva lista?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => setReplaceAll(true)}
                  style={{
                    padding: '0.85rem 1rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: replaceAll ? 'hsla(0,80%,55%,0.15)' : 'var(--bg-surface)',
                    borderWidth: '2px', borderStyle: 'solid',
                    borderColor: replaceAll ? 'hsl(0,80%,55%)' : 'var(--border-color)',
                    textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <p style={{ fontWeight: 700, color: replaceAll ? 'hsl(0,80%,65%)' : 'var(--text-main)', marginBottom: '0.2rem' }}>
                    🔄 Reemplazar — borrar el catálogo actual y cargar el nuevo
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Útil cuando el mayorista actualiza toda la lista de precios
                  </p>
                </button>
                <button
                  onClick={() => setReplaceAll(false)}
                  style={{
                    padding: '0.85rem 1rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: !replaceAll ? 'hsla(270,80%,55%,0.1)' : 'var(--bg-surface)',
                    borderWidth: '2px', borderStyle: 'solid',
                    borderColor: !replaceAll ? 'var(--primary)' : 'var(--border-color)',
                    textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <p style={{ fontWeight: 700, color: !replaceAll ? 'var(--primary)' : 'var(--text-main)', marginBottom: '0.2rem' }}>
                    ➕ Agregar / Actualizar — mantener el catálogo y sumar productos
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Actualiza precios existentes y agrega productos nuevos sin borrar nada
                  </p>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">El catálogo está vacío. Se cargarán los productos del archivo.</p>
          )}

          <label className="btn btn-primary w-full flex-center gap-2" style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
            <Upload size={20} />
            {isLoading ? 'Leyendo...' : 'Elegir archivo Excel / CSV'}
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: data.length < 5 ? 'var(--warning, #F7941D)' : 'var(--success)', fontWeight: 600 }}>
            {data.length < 5 ? '⚠️' : '✓'} {data.length} fila{data.length !== 1 ? 's' : ''} detectada{data.length !== 1 ? 's' : ''}
            {data.length < 5 && <span style={{ fontWeight: 400, fontSize: '0.78rem', display: 'block', color: 'var(--text-muted)' }}>
              Puede que el encabezado no se detectó bien. Verificá que las columnas de abajo sean correctas.
            </span>}
          </p>

          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '-0.5rem' }}>
            Columnas encontradas: <strong>{headers.join(' · ')}</strong>
          </p>

          {['codigo', 'descripcion', 'precio'].map((role) => {
            const labels = { codigo: 'Código / SKU', descripcion: 'Descripción del producto', precio: 'Precio unitario' };
            const samples = getSamples(data, headers, mapped[role]);
            return (
              <div key={role}>
                <label className="text-sm font-semibold text-primary" style={{ display: 'block', marginBottom: '0.3rem' }}>
                  {labels[role]}
                </label>
                <select
                  className="input-glass"
                  style={{ padding: '0.5rem', width: '100%' }}
                  value={mapped[role]}
                  onChange={e => setMapped({ ...mapped, [role]: e.target.value })}
                >
                  <option value="">-- elegir columna --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {samples && (
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Ej: {samples}
                  </p>
                )}
              </div>
            );
          })}

          {replaceAll && (
            <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'hsla(0,100%,65%,0.1)', border: '1px solid hsla(0,100%,65%,0.3)' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>
                ⚠️ Esto borrará los {products.length} productos actuales y los reemplazará
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn w-full" onClick={() => { setData([]); setHeaders([]); }}>← Volver</button>
            <button className="btn btn-primary w-full" onClick={handleImport}>
              {replaceAll ? <><RefreshCw size={16} /> Reemplazar</> : <><PlusCircle size={16} /> Importar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
