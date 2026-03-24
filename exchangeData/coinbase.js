import WebSocket from 'ws';
const WS_URL = 'wss://advanced-trade-ws.coinbase.com';
const PRODUCTS = ['BTC-USD'];
function connect() {
  const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
        console.log('Connected to Coinbase WebSocket');
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'ticker',
            product_ids: PRODUCTS,
        })); 
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'level2',
            product_ids: PRODUCTS,
        }));
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'heartbeats',
            product_ids: PRODUCTS,
        }));
    }); 
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Data:', JSON.stringify(msg));
    });
    ws.on('close', () => {
        console.log('Disconnected from Coinbase WebSocket');
        setTimeout(connect, 5000);
    });
}
connect();