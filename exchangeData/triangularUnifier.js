import WebSocket from 'ws';
import { EventEmitter } from 'events';

const EXCHANGE = 'KRAKEN'; 
const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';
const KRAKEN_PAIRS = ['BTC/USD', 'ETH/USD', 'ETH/BTC']; 
const COINBASE_WS_URL = 'wss://advanced-trade-ws.coinbase.com';
const COINBASE_PAIRS = ['BTC-USD', 'ETH-USD', 'ETH-BTC'];

export const priceEmitter = new EventEmitter();

const prices = {
    'BTC/USD': { bid: null, ask: null },
    'ETH/USD': { bid: null, ask: null },
    'ETH/BTC': { bid: null, ask: null }
};

function connectKraken() {
    const ws = new WebSocket(KRAKEN_WS_URL);
    ws.on('open', () => {
        console.log('Connected to Kraken WebSocket for Triangular Arbitrage');
        ws.send(JSON.stringify({
            method: 'subscribe',
            params: {
                channel: 'ticker',
                symbol: KRAKEN_PAIRS
            }
        }));
    });
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.channel === 'ticker' && data.data && data.data[0]) {
            const ticker = data.data[0];
            const pair = ticker.symbol;
            prices[pair] = {
                bid: parseFloat(ticker.bid),
                ask: parseFloat(ticker.ask),
                bidVolume: parseFloat(ticker.bid_qty),
                askVolume: parseFloat(ticker.ask_qty)
            };
            priceEmitter.emit('update', prices);
        }
    });
    ws.on('close', () => {
        console.log('Disconnected from Kraken. Reconnecting...');
        setTimeout(connectKraken, 5000);
    });
    ws.on('error', (err) => {
        console.error('Kraken WebSocket error:', err.message);
    });
}

function connectCoinbase() {
    const ws = new WebSocket(COINBASE_WS_URL);
    const orderBooks = {
        'BTC-USD': { bids: new Map(), asks: new Map() },
        'ETH-USD': { bids: new Map(), asks: new Map() },
        'ETH-BTC': { bids: new Map(), asks: new Map() }
    };
    ws.on('open', () => {
        console.log('Connected to Coinbase WebSocket for Triangular Arbitrage');
        
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'level2',
            product_ids: COINBASE_PAIRS
        }));
    });
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.channel === 'l2_data' && data.events && data.events[0]) {
            const event = data.events[0];
            const pair = event.product_id;
            const book = orderBooks[pair];
            if (!book) return;
            event.updates.forEach(update => {
                const side = update.side === 'bid' ? book.bids : book.asks;
                const price = update.price_level;
                const qty = parseFloat(update.new_quantity);
                if (qty === 0) {
                    side.delete(price);
                } else {
                    side.set(price, qty);
                }
            });
            if (book.bids.size > 0 && book.asks.size > 0) {
                const bestBid = Math.max(...Array.from(book.bids.keys()).map(Number));
                const bestAsk = Math.min(...Array.from(book.asks.keys()).map(Number));
                const normalizedPair = pair.replace('-', '/');
                prices[normalizedPair] = {
                    bid: bestBid,
                    ask: bestAsk,
                    bidVolume: book.bids.get(String(bestBid)),
                    askVolume: book.asks.get(String(bestAsk))
                };
                priceEmitter.emit('update', prices);
            }
        }
    });
    ws.on('close', () => {
        console.log('Disconnected from Coinbase. Reconnecting...');
        setTimeout(connectCoinbase, 5000);
    });
    ws.on('error', (err) => {
        console.error('Coinbase WebSocket error:', err.message);
    });
}

function start() {
    console.log(`Starting Triangular Arbitrage on ${EXCHANGE}...`);
    if (EXCHANGE === 'KRAKEN') {
        connectKraken();
    } else if (EXCHANGE === 'COINBASE') {
        connectCoinbase();
    } else {
        console.error('Invalid exchange. Choose KRAKEN or COINBASE');
    }
}
start();