import { useStore } from '../store';
import { UserPlus, Users, Tag, ClipboardList, ChevronRight, TrendingUp } from 'lucide-react';

const ALL_ACTIONS = [
  {
    icon: UserPlus,
    label: 'Datos de mi empresa',
    sub: 'Completá tu perfil de mayorista',
    screen: 'settings',
    color: 'hsl(248, 90%, 66%)',
    bg: 'hsla(248, 90%, 66%, 0.12)',
    border: 'hsla(248, 90%, 66%, 0.28)',
    adminOnly: true,
  },
  {
    icon: Users,
    label: 'Clientes',
    sub: 'Buscá o agregá clientes',
    screen: 'clients',
    color: 'hsl(210, 90%, 60%)',
    bg: 'hsla(210, 90%, 60%, 0.12)',
    border: 'hsla(210, 90%, 60%, 0.28)',
    adminOnly: false,
  },
  {
    icon: Tag,
    label: 'Lista de precios',
    sub: 'Importá o editá tu catálogo',
    screen: 'admin',
    color: 'hsl(188, 85%, 48%)',
    bg: 'hsla(188, 85%, 48%, 0.12)',
    border: 'hsla(188, 85%, 48%, 0.28)',
    adminOnly: true,
  },
  {
    icon: ClipboardList,
    label: 'Historial de pedidos',
    sub: 'Ver todos los pedidos anteriores',
    screen: 'history',
    color: 'hsl(152, 72%, 42%)',
    bg: 'hsla(152, 72%, 42%, 0.12)',
    border: 'hsla(152, 72%, 42%, 0.28)',
    adminOnly: false,
  },
];

export default function HomeScreen({ onNavigate }) {
  const rol = useStore(state => state.rol);
  const mayorista = useStore(state => state.mayorista);
  const isAdmin = rol === 'admin';
  const ACTIONS = ALL_ACTIONS.filter(a => !a.adminOnly || isAdmin);
  const nombreEmpresa = mayorista?.nombre;

  return (
    <div className="p-4">
      {/* Header */}
      <header style={{ marginBottom: '1.5rem', marginTop: '0.25rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.2rem' }}>
          {rol === 'admin' ? 'Panel del mayorista' : rol === 'vendedor' ? 'Panel del vendedor' : 'Inicio'}
        </p>
        <h1 style={{
          fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.5px',
          color: 'var(--text-main)', margin: 0
        }}>
          {nombreEmpresa ? nombreEmpresa : 'Bienvenido'}
        </h1>
        {nombreEmpresa && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {isAdmin ? '¿Qué querés hacer hoy?' : 'Seleccioná una opción'}
          </p>
        )}
      </header>

      {/* Quick action: new order */}
      <button
        onClick={() => onNavigate('clients')}
        style={{
          width: '100%', padding: '1rem 1.1rem',
          background: 'var(--primary-gradient)',
          border: 'none', borderRadius: 'var(--radius-md)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-glow)',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-sm)',
            background: 'hsla(255,100%,100%,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2 }}>Nuevo pedido</p>
            <p style={{ fontSize: '0.76rem', opacity: 0.8, marginTop: '1px' }}>Seleccioná un cliente para empezar</p>
          </div>
        </div>
        <ChevronRight size={20} style={{ opacity: 0.8, flexShrink: 0 }} />
      </button>

      {/* Other actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {ACTIONS.map(({ icon: Icon, label, sub, screen, color, bg, border }) => (
          <button
            key={screen}
            onClick={() => onNavigate(screen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.9rem',
              width: '100%', padding: '0.85rem 1rem',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--text-main)', textAlign: 'left',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = bg;
              e.currentTarget.style.borderColor = border;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-surface-2)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: bg, border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icon size={20} style={{ color }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.3 }}>{label}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '1px' }}>{sub}</p>
            </div>

            <ChevronRight size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
