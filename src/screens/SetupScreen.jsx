import { useState } from 'react';
import { Building2, Users, Loader, ArrowRight, KeyRound } from 'lucide-react';
import { useStore } from '../store';
import { createEmpresa, joinEmpresa, getDeviceId } from '../services/firebase';

export default function SetupScreen() {
  const [mode, setMode]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [vendorName, setVendorName] = useState('');

  const mayorista     = useStore(s => s.mayorista);
  const products      = useStore(s => s.products);
  const setEmpresaInfo = useStore(s => s.setEmpresaInfo);

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const deviceId             = await getDeviceId();
      const { empresaId, codigo } = await createEmpresa(mayorista, products);
      setEmpresaInfo({ empresaId, empresaCodigo: codigo, rol: 'admin', vendedorId: deviceId, vendedorNombre: 'Admin' });
    } catch {
      setError('Error al crear la empresa. Verificá tu conexión a internet.');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !vendorName.trim()) { setError('Ingresá el código y tu nombre'); return; }
    setLoading(true); setError('');
    try {
      const deviceId                       = await getDeviceId();
      const { empresaId, empresaData }     = await joinEmpresa(joinCode.trim(), vendorName.trim());
      setEmpresaInfo({ empresaId, empresaCodigo: empresaData.codigo, rol: 'vendor', vendedorId: deviceId, vendedorNombre: vendorName.trim() });
    } catch (e) {
      setError(e.message || 'Código inválido. Verificá con tu mayorista.');
    }
    setLoading(false);
  };

  if (mode === 'create') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
      <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        ← Volver
      </button>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Building2 size={52} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Crear empresa</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {mayorista.nombre ? `Se creará con los datos de "${mayorista.nombre}"` : 'Se publicará tu lista de productos actual'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
          {products.length} producto{products.length !== 1 ? 's' : ''} listos para publicar
        </p>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
      <button onClick={handleCreate} disabled={loading} style={{
        width: '100%', padding: '1rem', borderRadius: '16px', border: 'none',
        background: 'linear-gradient(135deg, hsl(270,100%,55%), hsl(240,100%,60%))',
        color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.8 : 1
      }}>
        {loading
          ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Creando empresa...</>
          : <>Crear empresa <ArrowRight size={20} /></>}
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (mode === 'join') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
      <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        ← Volver
      </button>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <KeyRound size={52} style={{ color: 'hsl(150,80%,50%)', marginBottom: '0.75rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Unirme con código</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresá el código que te mandó tu mayorista</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input
          className="input-glass"
          placeholder="Tu nombre (ej: Juan López)"
          value={vendorName}
          onChange={e => setVendorName(e.target.value)}
          style={{ fontSize: '1rem', padding: '0.85rem' }}
        />
        <input
          className="input-glass"
          placeholder="Código de empresa (ej: GARCIA-1234)"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          style={{ fontSize: '1rem', padding: '0.85rem', letterSpacing: '0.05em', fontWeight: 600 }}
        />
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
      <button onClick={handleJoin} disabled={loading} style={{
        width: '100%', padding: '1rem', borderRadius: '16px', border: 'none',
        background: 'linear-gradient(135deg, hsl(150,80%,30%), hsl(150,80%,42%))',
        color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.8 : 1
      }}>
        {loading
          ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Conectando...</>
          : <>Conectarme <ArrowRight size={20} /></>}
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <img src={`${import.meta.env.BASE_URL}icon3-512.png`} alt="Mayolista" width={72} height={72}
          style={{ borderRadius: '50%', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: '0.5rem' }}>Bienvenido</h1>
        <p style={{ color: 'var(--text-muted)' }}>¿Cómo querés usar Mayolista?</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={() => setMode('create')} style={{
          width: '100%', padding: '1.25rem', borderRadius: '18px',
          border: '2px solid hsl(270,100%,55%)', background: 'hsla(270,100%,55%,0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left'
        }}>
          <Building2 size={34} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>Soy el mayorista</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              Creo mi empresa, publico mi lista y genero un código para mis vendedores
            </p>
          </div>
        </button>
        <button onClick={() => setMode('join')} style={{
          width: '100%', padding: '1.25rem', borderRadius: '18px',
          border: '2px solid hsl(150,80%,40%)', background: 'hsla(150,80%,40%,0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left'
        }}>
          <Users size={34} style={{ color: 'hsl(150,80%,50%)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>Soy vendedor</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              Tengo un código de empresa — me conecto y descargo la lista automáticamente
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
