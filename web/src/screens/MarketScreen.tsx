import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import { useToast } from '../components/Toast';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { GameInput, GameSelect } from '../components/ui/GameInput';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { gameModal } from '../components/GameModal';

export function MarketScreen() {
  const [resource, setResource] = useState('WOOD');
  const [book, setBook] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  
  // Order Form
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('1.0');
  const [qty, setQty] = useState('100');

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const [bookData, ordersData] = await Promise.all([
        api.getMarketBook(resource),
        api.getMyOrders()
      ]);
      setBook(bookData);
      setMyOrders(ordersData.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
  }, [resource]);

  const handlePlaceOrder = async () => {
    try {
      await api.placeOrder({
        side,
        resource,
        price: parseFloat(price),
        qty: parseInt(qty)
      });
      showToast('Order placed!', 'success');
      fetchMarket();
    } catch (e: any) {
      showToast(e.message || 'Failed to place order', 'error');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!await gameModal.confirm('Cancel this order?')) return;
    try {
      await api.cancelOrder(orderId);
      showToast('Order cancelled', 'info');
      fetchMarket();
    } catch (e: any) {
      gameModal.error(e.message || 'Failed to cancel');
    }
  };

  return (
    <div className="flex-col gap-lg" style={{ height: '100%', paddingBottom: '2rem' }}>
      <div className="flex justify-between items-center">
        <h1 style={{ margin: 0, color: 'var(--color-gold)', textShadow: '0 2px 4px black' }}>Marketplace</h1>
        
        <div style={{ width: '200px' }}>
          <GameSelect value={resource} onChange={e => setResource(e.target.value)} fullWidth>
            <option value="WOOD">Wood</option>
            <option value="STONE">Stone</option>
            <option value="FOOD">Food</option>
            <option value="COINS">Coins (Exchange)</option>
          </GameSelect>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', flex: 1, minHeight: 0 }}>
        
        {/* Order Book */}
        <GameCard title={`Order Book (${resource})`} className="flex-col" style={{ minHeight: 0 }}>
          {loading ? <LoadingScreen message="" /> : (
            <div className="flex gap-md" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'var(--color-success)', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Bids (Buying)</h4>
                {book?.bids?.length === 0 && <p style={{ fontSize: '0.9rem', opacity: 0.5 }}>No active bids</p>}
                {book?.bids?.map((order: any) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>{order.price.toFixed(2)}</span>
                    <span>{order.qty - order.qty_filled}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'var(--color-danger)', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Asks (Selling)</h4>
                {book?.asks?.length === 0 && <p style={{ fontSize: '0.9rem', opacity: 0.5 }}>No active asks</p>}
                {book?.asks?.map((order: any) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>{order.price.toFixed(2)}</span>
                    <span>{order.qty - order.qty_filled}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GameCard>

        {/* Place Order Form */}
        <div className="flex-col gap-md">
          <GameCard title="Place Order">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <GameButton 
                fullWidth
                variant={side === 'buy' ? 'green' : 'gray'} 
                onClick={() => setSide('buy')}
                style={{ opacity: side === 'buy' ? 1 : 0.5 }}
              >
                Buy
              </GameButton>
              <GameButton 
                fullWidth
                variant={side === 'sell' ? 'red' : 'gray'}
                onClick={() => setSide('sell')}
                style={{ opacity: side === 'sell' ? 1 : 0.5 }}
              >
                Sell
              </GameButton>
            </div>
            
            <div className="flex-col gap-md">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Price per Unit</label>
                <GameInput fullWidth type="number" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Quantity</label>
                <GameInput fullWidth type="number" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', textAlign: 'right' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Total Cost: </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                  {(parseFloat(price || '0') * parseInt(qty || '0')).toFixed(2)}
                </span>
              </div>

              <GameButton 
                fullWidth 
                variant="blue" 
                onClick={handlePlaceOrder}
                style={{ marginTop: '0.5rem' }}
              >
                Place {side.toUpperCase()} Order
              </GameButton>
            </div>
          </GameCard>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#aaa', marginBottom: '0.5rem' }}>My Active Orders</h3>
            {myOrders.length === 0 ? <p style={{ opacity: 0.5 }}>No active orders.</p> : (
              <div className="flex-col gap-sm">
                {myOrders.map(order => (
                  <div key={order.id} style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    padding: '0.75rem', 
                    borderRadius: '4px', 
                    borderLeft: `4px solid ${order.side === 'buy' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {order.side.toUpperCase()} {order.resource_code}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                        {order.qty_filled} / {order.qty} @ {order.price.toFixed(2)}
                      </div>
                    </div>
                    <GameButton size="sm" variant="red" onClick={() => handleCancel(order.id)}>Cancel</GameButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
