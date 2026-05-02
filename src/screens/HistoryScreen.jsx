import React from 'react';
import { useStore } from '../store';
import { ChevronLeft, RotateCcw, Clock } from 'lucide-react';

export default function HistoryScreen({ onNavigate }) {
  const currentClient = useStore(state => state.currentOrder.client);
  const ordersHistory = useStore(state => state.ordersHistory || []);
  const repeatOrder = useStore(state => state.repeatOrder);

  const clientOrders = currentClient 
    ? ordersHistory.filter(o => o.client.id === currentClient.id)
    : [];

  const handleRepeat = (order) => {
    if (confirm('¿Deseas reemplazar tu pedido actual con los ítems de este pedido anterior?')) {
      repeatOrder(order);
      onNavigate('order');
    }
  };

  if (!currentClient) {
    return (
      <div className="p-4 flex-center flex-col mt-10">
        <h2 className="text-xl mb-4 text-center">No hay cliente seleccionado</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('clients')}>Seleccionar Cliente</button>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ paddingBottom: '2rem' }}>
      <header className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn" style={{ padding: '0.5rem' }} onClick={() => onNavigate('clients')}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl">Historial de Pedidos</h1>
          <p className="text-muted text-primary">{currentClient.name}</p>
        </div>
      </header>

      {clientOrders.length === 0 ? (
        <div className="flex-center flex-col p-10 text-muted text-center glass-panel">
          <Clock size={48} className="mb-4 opacity-50" />
          <p>Este cliente aún no tiene pedidos confirmados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {clientOrders.map(order => (
            <div key={order.id} className="glass-panel p-4 animate-slide-up">
              <div className="flex-between mb-3 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <span className="font-bold block w-full">{new Date(order.date).toLocaleDateString('es-AR')}</span>
                  <span className="text-xs text-muted block">{new Date(order.date).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} | Ref: {order.id.slice(-6)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary text-lg">${order.total.toLocaleString('es-AR')}</span>
                  <span className="text-sm text-muted block">{order.items.reduce((acc, i) => acc + i.quantity, 0)} ítems</span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-semibold mb-1">Detalle de productos:</p>
                <div className="text-sm text-muted" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex-between mb-1 hover:text-black">
                      <span className="truncate pr-2">{item.quantity}x {item.product.name}</span>
                      <span>${(item.product.price * item.quantity).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                className="btn btn-primary w-full flex-center gap-2"
                onClick={() => handleRepeat(order)}
              >
                <RotateCcw size={18} /> Repetir Pedido Exacto
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
