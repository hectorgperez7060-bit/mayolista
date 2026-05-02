import React, { useState } from 'react';
import { useStore } from '../store';
import { Search, UserCheck, Plus, Clock } from 'lucide-react';

const CONDICION_IVA = ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'];

export default function ClientsScreen({ onNavigate }) {
  const clients = useStore(state => state.clients);
  const setClient = useStore(state => state.setClient);
  const addClient = useStore(state => state.addClient);
  const currentClient = useStore(state => state.currentOrder.client);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', cuit: '', condicionIVA: '' });

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
    (c.cuit && c.cuit.includes(search))
  );

  const handleSelect = (client) => {
    setClient(client);
    onNavigate('order');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return alert("El nombre es obligatorio");
    addClient(form);
    setShowForm(false);
    setForm({ name: '', address: '', phone: '', email: '', cuit: '', condicionIVA: '' });
  };

  return (
    <div className="p-4" style={{ paddingBottom: '2rem' }}>
      <header className="mb-4">
        <h1 className="text-xl">Clientes</h1>
        <p className="text-muted">Selecciona o crea un cliente para el pedido</p>
      </header>

      {showForm ? (
        <form onSubmit={handleSubmit} className="glass-panel p-4 mb-4 animate-slide-up">
          <h2 className="text-lg mb-4 text-primary">Nuevo Cliente</h2>
          <div className="flex flex-col gap-3">
            <input className="input-glass" placeholder="Nombre Comercial / Razón Social" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <input className="input-glass" placeholder="CUIT / DNI" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
              <select className="input-glass" value={form.condicionIVA} onChange={e => setForm({...form, condicionIVA: e.target.value})} style={{ appearance: 'none', WebkitAppearance: 'none' }}>
                <option value="">Cond. IVA</option>
                {CONDICION_IVA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input className="input-glass" placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <input className="input-glass" placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="input-glass" type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn w-full" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary w-full">Guardar</button>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)' }}><Search size={20} /></div>
              <input type="text" placeholder="Buscar cliente..." className="input-glass" style={{ paddingLeft: '3rem', width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary flex-center" style={{ padding: '0 1rem' }} onClick={() => setShowForm(true)} title="Nuevo Cliente">
              <Plus size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(client => (
              <div 
                key={client.id} 
                className="glass-panel p-4"
                style={{ borderColor: currentClient?.id === client.id ? 'var(--primary)' : 'var(--border-color)', cursor: 'pointer' }}
                onClick={() => handleSelect(client)}
              >
                <div className="flex-between">
                  <div>
                    <h3 className="text-lg">{client.name}</h3>
                    {(client.cuit || client.condicionIVA || client.address) && (
                      <p className="text-muted text-sm mt-1">
                        {client.cuit && `CUIT: ${client.cuit}`}{client.condicionIVA && ` · ${client.condicionIVA}`}{client.address && ` · ${client.address}`}
                      </p>
                    )}
                  </div>
                  {currentClient?.id === client.id && <UserCheck size={24} className="text-primary" />}
                </div>
                {currentClient?.id === client.id && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn flex-center gap-1 text-sm text-primary" 
                      onClick={(e) => { e.stopPropagation(); onNavigate('history'); }}
                      style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid var(--primary)' }}
                    >
                      <Clock size={16} /> Ver Historial
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted p-4">No se encontraron clientes.</p>}
          </div>
        </>
      )}
    </div>
  );
}
