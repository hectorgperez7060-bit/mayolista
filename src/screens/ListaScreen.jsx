import { useState, useMemo } from 'react';
import { Search, FileDown, Printer, Share2, List } from 'lucide-react';
import { useStore } from '../store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GREEN = [39, 174, 96];
const DARK  = [30, 30, 30];
const MUTED = [110, 110, 110];

function fmtMoney(n) {
  return (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function buildListaPDFBlob(products, mayorista) {
  const doc   = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const mL = 14, rightX = pageW - 14;

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 3.5, 'F');

  let dY = 14;
  if (mayorista?.nombre) {
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(...DARK);
    doc.text(mayorista.nombre, mL, dY); dY += 6;
  }
  doc.setFont(undefined, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  if (mayorista?.telefono) { doc.text(`Tel: ${mayorista.telefono}`, mL, dY); dY += 4.5; }
  dY += 2;

  doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(...GREEN);
  doc.text('LISTA DE PRECIOS', mL, dY);
  doc.setFont(undefined, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text(`Actualizado: ${new Date().toLocaleDateString('es-AR')}`, rightX, dY, { align: 'right' });
  dY += 4;

  autoTable(doc, {
    startY: dY + 4,
    head: [['Código', 'Descripción', 'Precio']],
    body: products.map(p => [
      p.code || '',
      `${p.name}${p.description ? ' - ' + p.description : ''}${p.brand ? ' (' + p.brand + ')' : ''}`,
      `$${fmtMoney(p.price)}`
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 26, halign: 'right' } },
    margin: { left: mL, right: 14 },
  });

  return doc.output('blob');
}

export default function ListaScreen() {
  const products  = useStore(s => s.products);
  const mayorista = useStore(s => s.mayorista);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = normalize(search);
    return products.filter(p => {
      const text = normalize(`${p.name} ${p.description || ''} ${p.code || ''} ${p.brand || ''}`);
      return text.includes(q);
    });
  }, [search, products]);

  const fileName = 'Lista_de_precios.pdf';

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = buildListaPDFBlob(filtered, mayorista);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {}
    setGenerating(false);
  };

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const blob = buildListaPDFBlob(filtered, mayorista);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.addEventListener('load', () => win.print());
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {}
    setGenerating(false);
  };

  const handleShare = async () => {
    setGenerating(true);
    try {
      const blob = buildListaPDFBlob(filtered, mayorista);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Lista de precios' });
      } else {
        await handleDownload();
      }
    } catch {}
    setGenerating(false);
  };

  return (
    <div className="p-4" style={{ paddingBottom: '6rem' }}>
      <header className="mb-4">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <List size={22} style={{ color: 'hsl(150,70%,50%)' }} /> Lista de precios
        </h1>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          {products.length} producto{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="mb-4 relative" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)' }}>
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar producto, código, marca..."
          className="input-glass"
          style={{ paddingLeft: '3rem' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Acciones PDF */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button onClick={handleDownload} disabled={generating} className="btn" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '0.75rem 0.5rem', borderRadius: '14px', border: '1px solid hsla(150,70%,50%,0.35)',
          background: 'hsla(150,70%,45%,0.12)', color: 'hsl(150,70%,55%)', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.78rem', opacity: generating ? 0.6 : 1
        }}>
          <FileDown size={20} /> Descargar
        </button>
        <button onClick={handlePrint} disabled={generating} className="btn" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '0.75rem 0.5rem', borderRadius: '14px', border: '1px solid var(--border-color)',
          background: 'var(--bg-surface-glass)', color: 'var(--text-main)', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.78rem', opacity: generating ? 0.6 : 1
        }}>
          <Printer size={20} /> Imprimir
        </button>
        <button onClick={handleShare} disabled={generating} className="btn" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '0.75rem 0.5rem', borderRadius: '14px', border: '1px solid var(--border-color)',
          background: 'var(--bg-surface-glass)', color: 'var(--text-main)', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.78rem', opacity: generating ? 0.6 : 1
        }}>
          <Share2 size={20} /> Compartir
        </button>
      </div>

      {/* Lista completa, scrolleable */}
      <div className="flex flex-col gap-3">
        {filtered.map(product => (
          <div key={product.id} className="glass-panel p-3">
            <div className="flex-between" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {product.code && (
                  <span className="text-muted" style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600 }}>{product.code}</span>
                )}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3, marginTop: '2px' }}>{product.name}</h3>
                {product.description && (
                  <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '2px', lineHeight: 1.4 }}>{product.description}</p>
                )}
                {(product.brand || product.presentation || product.weight) && (
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    {[product.brand, product.presentation, product.weight].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(150,70%,50%)', whiteSpace: 'nowrap' }}>
                ${fmtMoney(product.price)}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted p-4">No hay resultados para "{search}".</p>
        )}
      </div>
    </div>
  );
}
