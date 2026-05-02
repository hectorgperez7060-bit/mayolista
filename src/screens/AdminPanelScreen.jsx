import { useState, useEffect } from 'react';
import { ChevronLeft, Copy, Check, RefreshCw, Users, ShoppingBag, Lock, Unlock, Eye, Loader, Share2 } from 'lucide-react';
import { useStore } from '../store';
import {
  listenVendedores, listenPedidos,
  setVendorBlocked, markOrderSeen,
  renewCode, syncProductos, updateEmpresaData
} from '../services/firebase';

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function timeAgo(ts) {
  if (!ts?.toMillis) return 'nunca';
  const diff = Date.now() - ts.toMillis();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  if (hrs  < 24) return `hace ${hrs}h`;
  return `hace ${days}d`;
}

export default function AdminPanelScreen({ onNavigate }) {
  const [tab, setTab]                   = useState('vendedores');
  const [vendedores, setVendedores]     = useState([]);
  const [pedidos, setPedidos]           = useState([]);
  const [copied, setCopied]             = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState('');
  const [generatingCode, setGenerating] = useState(false);
  const [confirmNewCode, setConfirmNewCode] = useState(false);

  const empresaId     = useStore(s => s.empresaId);
  const empresaCodigo = useStore(s => s.empresaCodigo);
  const vendedorId    = useStore(s => s.vendedorId);
  const mayorista     = useStore(s => s.mayorista);
  const products      = useStore(s => s.products);
  const setEmpresaInfo = useStore(s => s.setEmpresaInfo);

  useEffect(() => {
    if (!empresaId) return;
    const u1 = listenVendedores(empresaId, setVendedores);
    const u2 = listenPedidos(empresaId, setPedidos);
    return () => { u1(); u2(); };
  }, [empresaId]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(empresaCodigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    const text = `Unite a Mayolista con el código: *${empresaCodigo}*\nDescargá la app: https://hectorgperez7060-bit.github.io/mayolista/`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Código Mayolista', text }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSyncProducts = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      await syncProductos(empresaId, products);
      setSyncMsg(`✓ ${products.length} productos publicados`);
    } catch {
      setSyncMsg('Error al sincronizar. Verificá tu conexión.');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3500);
  };

  const handleSyncData = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      await updateEmpresaData(empresaId, mayorista);
      setSyncMsg('✓ Datos del mayorista publicados');
    } catch {
      setSyncMsg('Error al sincronizar.');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3500);
  };

  const handleNewCode = async () => {
    setGenerating(true); setConfirmNewCode(false);
    try {
      const newCode = await renewCode(empresaId, mayorista.nombre);
      setEmpresaInfo({ empresaCodigo: newCode });
    } catch {}
    setGenerating(false);
  };

  const otrosVendedores = vendedores.filter(v => v.id !== vendedorId);
  const pendientes      = pedidos.filter(p => p.estado === 'pendiente').length;

  return (
    <div className="p-4" style={{ paddingBottom: '2rem' }}>
      <header className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl">Panel de Empresa</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>{mayorista.nombre || 'Mi empresa'}</p>
        </div>
      </header>

      {/* Código */}
      <div className="glass-panel p-4 mb-4" style={{ background: 'hsla(270,100%,55%,0.07)', border: '1px solid hsla(270,100%,55%,0.25)' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.06em' }}>
          CÓDIGO DE EMPRESA
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--primary)', flex: 1 }}>
            {empresaCodigo}
          </span>
          <button onClick={handleCopyCode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'hsl(150,80%,50%)' : 'var(--text-muted)', padding: '0.35rem' }}>
            {copied ? <Check size={22} /> : <Copy size={22} />}
          </button>
          <button onClick={handleShareCode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.35rem' }}>
            <Share2 size={22} />
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Compartí este código con tus vendedores para que se conecten
        </p>

        {!confirmNewCode ? (
          <button onClick={() => setConfirmNewCode(true)} style={{
            marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer',
            color: 'hsl(0,80%,65%)', fontSize: '0.78rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '4px', padding: 0
          }}>
            <RefreshCw size={13} /> Generar código nuevo
          </button>
        ) : (
          <div style={{ marginTop: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'hsl(0,80%,65%)', flex: 1 }}>
              ¿Seguro? El código actual dejará de funcionar.
            </p>
            <button onClick={handleNewCode} disabled={generatingCode} style={{
              padding: '0.3rem 0.7rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'hsl(0,80%,55%)', color: '#fff', fontWeight: 700, fontSize: '0.75rem'
            }}>
              {generatingCode ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sí, generar'}
            </button>
            <button onClick={() => setConfirmNewCode(false)} style={{
              padding: '0.3rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem'
            }}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Publicar */}
      <div className="glass-panel p-3 mb-4">
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.06em' }}>
          PUBLICAR CAMBIOS A VENDEDORES
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={handleSyncProducts} disabled={syncing} style={{
            flex: 1, padding: '0.65rem', borderRadius: '12px', border: 'none',
            background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
            cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
          }}>
            {syncing && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
            Publicar lista ({products.length})
          </button>
          <button onClick={handleSyncData} disabled={syncing} style={{
            flex: 1, padding: '0.65rem', borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-glass)', color: 'var(--text-main)',
            fontWeight: 700, fontSize: '0.82rem', cursor: syncing ? 'default' : 'pointer',
            opacity: syncing ? 0.7 : 1
          }}>
            Publicar datos
          </button>
        </div>
        {syncMsg && (
          <p style={{
            marginTop: '8px', fontSize: '0.78rem', fontWeight: 600,
            color: syncMsg.startsWith('✓') ? 'hsl(150,80%,50%)' : 'var(--danger)'
          }}>{syncMsg}</p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { key: 'vendedores', label: `Vendedores (${otrosVendedores.length})`, icon: <Users size={15} /> },
          { key: 'pedidos',    label: 'Pedidos',                                 icon: <ShoppingBag size={15} /> }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '0.6rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--primary)' : 'var(--bg-surface-glass)',
            color: tab === t.key ? '#fff' : 'var(--text-muted)',
            fontWeight: 700, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
          }}>
            {t.icon} {t.label}
            {t.key === 'pedidos' && pendientes > 0 && (
              <span style={{
                background: 'hsl(0,80%,60%)', color: '#fff',
                borderRadius: '999px', padding: '1px 6px', fontSize: '0.7rem'
              }}>{pendientes}</span>
            )}
          </button>
        ))}
      </div>

      {/* Vendedores */}
      {tab === 'vendedores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {otrosVendedores.length === 0 ? (
            <div className="glass-panel p-5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={34} style={{ opacity: 0.25, marginBottom: '0.6rem' }} />
              <p style={{ fontSize: '0.9rem' }}>Ningún vendedor conectado aún</p>
              <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>Compartí el código para que se unan</p>
            </div>
          ) : otrosVendedores.map(v => (
            <div key={v.id} className="glass-panel p-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: v.bloqueado ? 0.6 : 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: v.bloqueado ? 'hsl(0,60%,25%)' : 'hsla(270,100%,55%,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.05rem',
                color: v.bloqueado ? 'hsl(0,80%,70%)' : 'var(--primary)'
              }}>
                {v.nombre?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.nombre}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {v.bloqueado ? '🔴 Bloqueado' : '🟢 Activo'} · {timeAgo(v.lastSeen)}
                </p>
              </div>
              <button onClick={() => setVendorBlocked(empresaId, v.id, !v.bloqueado)} style={{
                padding: '0.4rem 0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: v.bloqueado ? 'hsla(150,80%,40%,0.15)' : 'hsla(0,80%,55%,0.12)',
                color: v.bloqueado ? 'hsl(150,80%,50%)' : 'hsl(0,80%,65%)',
                fontWeight: 700, fontSize: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {v.bloqueado ? <><Unlock size={14} /> Activar</> : <><Lock size={14} /> Bloquear</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pedidos */}
      {tab === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {pedidos.length === 0 ? (
            <div className="glass-panel p-5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShoppingBag size={34} style={{ opacity: 0.25, marginBottom: '0.6rem' }} />
              <p style={{ fontSize: '0.9rem' }}>Sin pedidos todavía</p>
            </div>
          ) : pedidos.map(p => (
            <div key={p.id} className="glass-panel p-3" style={{
              borderLeft: p.estado === 'pendiente' ? '3px solid var(--primary)' : '3px solid transparent'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.client?.name || 'Cliente'}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {p.vendedorNombre}
                    {p.date ? ` · ${new Date(p.date.toMillis()).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '0.5rem' }}>
                  <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>${fmtMoney(p.total)}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.items?.length || 0} productos</p>
                </div>
              </div>
              {p.estado === 'pendiente' && (
                <button onClick={() => markOrderSeen(empresaId, p.id)} style={{
                  marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '4px', padding: 0
                }}>
                  <Eye size={13} /> Marcar como visto
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
