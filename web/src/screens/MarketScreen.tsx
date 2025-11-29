
import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';

export function MarketScreen() {
  const [resource, setResource] = useState('WOOD');
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Order Form
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('1.0');
  const [qty, setQty] = useState('100');

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const [bookData] = await Promise.all([
        api.getMarketBook(resource),
        // Assume getMarketHistory exists or we skip for now if not ready
        // api.getMarketHistory(resource) 
        Promise.resolve([]) 
      ]);
      setBook(bookData);
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
      alert('Order placed!');
      fetchMarket();
    } catch (e: any) {
      alert(e.message || 'Failed to place order');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Marketplace</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <select value={resource} onChange={e => setResource(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="WOOD">Wood</option>
          <option value="STONE">Stone</option>
          <option value="FOOD">Food</option>
          <option value="COINS">Coins (Exchange)</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3>Order Book ({resource})</h3>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h4>Bids (Buying)</h4>
                {book?.bids?.map((order: any) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
                    <span>{order.price.toFixed(2)}</span>
                    <span>{order.qty - order.qty_filled}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <h4>Asks (Selling)</h4>
                {book?.asks?.map((order: any) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
                    <span>{order.price.toFixed(2)}</span>
                    <span>{order.qty - order.qty_filled}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h3>Place Order</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => setSide('buy')} 
              style={{ flex: 1, background: side === 'buy' ? '#4CAF50' : '#ddd', color: side === 'buy' ? 'white' : 'black' }}
            >Buy</button>
            <button 
              onClick={() => setSide('sell')}
              style={{ flex: 1, background: side === 'sell' ? '#f44336' : '#ddd', color: side === 'sell' ? 'white' : 'black' }}
            >Sell</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>
              Price per Unit:
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
            </label>
            <label>
              Quantity:
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
            </label>
            <p>Total: {(parseFloat(price) * parseInt(qty)).toFixed(2)} Coins</p>
            <button onClick={handlePlaceOrder} style={{ padding: '0.75rem', background: '#2196F3', color: 'white', border: 'none' }}>
              Place {side.toUpperCase()} Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

