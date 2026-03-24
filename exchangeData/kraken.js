import WebSocket from 'ws';
const WS_URL = 'wss://ws.kraken.com/v2';
const PAIRS = ['BTC/USD'];
function connect() {
  const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
        console.log('Connected to Kraken WebSocket');
        ws.send(JSON.stringify({
            method: 'subscribe',
            params: {"channel": 'ticker', "symbol": PAIRS},
        }));
        ws.send(JSON.stringify({
            method: 'subscribe',
            params: {"channel": 'book', "symbol": PAIRS},
        }));
    });
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Data:', JSON.stringify(msg));
    });
    ws.on('close', () => {
        console.log('Disconnected from Kraken WebSocket');
        setTimeout(connect, 5000);
    });
}
connect();