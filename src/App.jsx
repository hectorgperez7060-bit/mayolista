import { useState, useEffect, useRef } from 'react';
import { Home, Users, Search, ShoppingCart, Share2, Copy, Check, X, QrCode, Settings, LayoutGrid } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import ClientsScreen from './screens/ClientsScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProcessOrderScreen from './screens/ProcessOrderScreen';
import SummaryScreen from './screens/SummaryScreen';
import AdminScreen from './screens/AdminScreen';
import SettingsScreen from './screens/SettingsScreen';
import LandingScreen from './screens/LandingScreen';
import IntroScreen from './screens/IntroScreen';
import SetupScreen from './screens/SetupScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import { useStore } from './store';
import { getDeviceId, getProductos, getEmpresaData, updateLastSeen, listenVendedorBlocked } from './services/firebase';

function AppLogo({ size = 32 }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icon3-512.png`}
      alt="Mayolista"
      width={size} height={size}
      draggable={false}
      onContextMenu={e => e.preventDefault()}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

const APP_URL = 'https://hectorgperez7060-bit.github.io/mayolista/';
const QR_URL  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APP_URL)}&color=863bff&bgcolor=0d0d1a&margin=10`;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [showShare, setShowShare]         = useState(false);
  const [showIntro, setShowIntro]         = useState(() => !sessionStorage.getItem('intro-done'));
  const [isBlocked, setIsBlocked]         = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const blockedUnsubRef = useRef(null);

  const isLoggedIn    = useStore(s => s.isLoggedIn);
  const login         = useStore(s => s.login);
  const logout        = useStore(s => s.logout);
  const order         = useStore(s => s.currentOrder);
  const empresaId     = useStore(s => s.empresaId);
  const rol           = useStore(s => s.rol);
  const vendedorId    = useStore(s => s.vendedorId);
  const setMayorista  = useStore(s => s.setMayorista);
  const itemsCount    = order.items.reduce((acc, item) => acc + item.quantity, 0);

  // Remove mock data on first load
  useEffect(() => {
    const isMockProduct = id => ['101','102','103','104','105','106','107','108'].includes(id);
    const isMockClient  = id => ['C1','C2','C3','C4'].includes(id);
    useStore.setState(state => {
      const newProducts = state.products.filter(p => !isMockProduct(p.id));
      const newClients  = state.clients.filter(c => !isMockClient(c.id));
      if (newProducts.length !== state.products.length || newClients.length !== state.clients.length) {
        return { products: newProducts, clients: newClients };
      }
      return state;
    });
  }, []);

  // Firebase sync on app start
  useEffect(() => {
    if (!isLoggedIn || !empresaId || !vendedorId) return;

    (async () => {
      try {
        await getDeviceId();
        await updateLastSeen(empresaId, vendedorId);

        if (rol === 'vendor') {
          setSyncing(true);
          const [products, empresaData] = await Promise.all([
            getProductos(empresaId),
            getEmpresaData(empresaId)
          ]);

          if (products.length > 0) useStore.setState({ products });

          if (empresaData) {
            const { logo, ...rest } = empresaData;
            setMayorista(rest);
            if (logo) localStorage.setItem('mayorista-logo', logo);
            else localStorage.removeItem('mayorista-logo');
          }
          setSyncing(false);

          // Real-time block listener
          blockedUnsubRef.current?.();
          blockedUnsubRef.current = listenVendedorBlocked(empresaId, vendedorId, setIsBlocked);
        }
      } catch {
        setSyncing(false);
      }
    })();

    return () => { blockedUnsubRef.current?.(); };
  }, [isLoggedIn, empresaId]);

  if (showIntro) {
    return <IntroScreen onDone={() => {
      sessionStorage.setItem('intro-done', '1');
      setShowIntro(false);
    }} />;
  }

  if (!isLoggedIn) {
    return <LandingScreen onEnter={() => {
      localStorage.setItem('mayolista-entered', '1');
      localStorage.setItem('mayolista-session', '1');
      login();
    }} />;
  }

  if (!empresaId) {
    return <SetupScreen />;
  }

  if (isBlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Acceso desactivado</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '280px' }}>
          Tu acceso fue desactivado por el mayorista. Contactalo para más información.
        </p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('mayolista-session');
    logout();
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':       return <HomeScreen onNavigate={setCurrentScreen} />;
      case 'clients':    return <ClientsScreen onNavigate={setCurrentScreen} />;
      case 'history':    return <HistoryScreen onNavigate={setCurrentScreen} />;
      case 'order':      return <ProcessOrderScreen onNavigate={setCurrentScreen} />;
      case 'summary':    return <SummaryScreen onNavigate={setCurrentScreen} />;
      case 'admin':      return <AdminScreen onNavigate={setCurrentScreen} />;
      case 'settings':   return <SettingsScreen onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'adminPanel': return <AdminPanelScreen onNavigate={setCurrentScreen} />;
      default:           return <HomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <>
      <AppHeader onShare={() => setShowShare(true)} onSettings={() => setCurrentScreen('settings')} syncing={syncing} />
      <main style={{ paddingTop: '44px', paddingBottom: '5rem' }}>
        {renderScreen()}
      </main>
      <nav className="glass-panel" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxWidth: '600px', margin: '0 auto',
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        zIndex: 50
      }}>
        <div className="flex-between p-2">
          <NavButton icon={<Home size={22} />}          label="Inicio"   active={currentScreen === 'home'}       onClick={() => setCurrentScreen('home')} />
          <NavButton icon={<Users size={22} />}         label="Clientes" active={currentScreen === 'clients'}    onClick={() => setCurrentScreen('clients')} />
          <NavButton icon={<Search size={22} />}        label="Procesar" active={currentScreen === 'order'}      onClick={() => setCurrentScreen('order')} />
          <NavButton icon={<ShoppingCart size={22} />}  label="Resumen"  active={currentScreen === 'summary'}   onClick={() => setCurrentScreen('summary')} badge={itemsCount} />
          {rol === 'admin' && (
            <NavButton icon={<LayoutGrid size={22} />}  label="Empresa"  active={currentScreen === 'adminPanel'} onClick={() => setCurrentScreen('adminPanel')} />
          )}
        </div>
      </nav>
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  );
}

function AppHeader({ onShare, onSettings, syncing }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      maxWidth: '600px', margin: '0 auto', height: '44px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AppLogo size={30} />
        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Mayolista</span>
        {syncing && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '2px' }}>
            sincronizando...
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button onClick={onSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
          <Settings size={20} />
        </button>
        <button onClick={onShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
}

function ShareModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Mayolista', text: 'App de pedidos mayoristas — rápida y fácil', url: APP_URL }); } catch {}
    } else { handleCopy(); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(APP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'hsla(0,0%,0%,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.25rem 2rem', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AppLogo size={36} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Compartir Mayolista</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invitá a otros a usarla</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={handleShare} style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, hsl(270,100%,55%), hsl(240,100%,60%))', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <Share2 size={20} /> Compartir por WhatsApp / Más
          </button>
          <button onClick={handleCopy} style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-surface-glass)', color: copied ? 'hsl(150,100%,55%)' : 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'color 0.2s' }}>
            {copied ? <><Check size={18} /> ¡Link copiado!</> : <><Copy size={18} /> Copiar link</>}
          </button>
          <button onClick={() => setShowQR(v => !v)} style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-surface-glass)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <QrCode size={18} /> {showQR ? 'Ocultar QR' : 'Mostrar código QR'}
          </button>
          {showQR && (
            <div style={{ textAlign: 'center', padding: '1rem', background: '#0d0d1a', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <img src={QR_URL} alt="QR Mayolista" draggable={false} onContextMenu={e => e.preventDefault()} style={{ width: '180px', height: '180px', borderRadius: '8px', pointerEvents: 'none' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Escaneá para abrir en otro celular</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.5rem', background: 'transparent', border: 'none', position: 'relative', color: active ? 'var(--primary)' : 'var(--text-muted)', transition: 'var(--transition)' }}>
      {icon}
      <span style={{ fontSize: '0.65rem', marginTop: '4px', fontWeight: active ? '600' : '400' }}>{label}</span>
      {badge > 0 && (
        <span className="flex-center" style={{ position: 'absolute', top: 0, right: '10%', background: 'var(--danger)', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', fontSize: '0.65rem', fontWeight: 'bold' }}>
          {badge}
        </span>
      )}
    </button>
  );
}
