import WebSocket from 'ws';
import { EventEmitter } from 'events';

const COINBASE_WS_URL = 'wss://advanced-trade-ws.coinbase.com';
const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';
const COINBASE_PRODUCTS = ['BTC-USD'];
const KRAKEN_PAIRS = ['BTC/USD'];

export const dataEmitter = new EventEmitter();

let krakenBid = null;
let krakenAsk = null;
let krakenBidVolume = null;
let krakenAskVolume = null;

let coinbaseBid = null;
let coinbaseAsk = null;
let coinbaseBidVolume = null;
let coinbaseAskVolume = null;

let cryptoData = {};

const orderBook = { 
    bids: new Map(), 
    asks: new Map() 
};

function emitDataUpdate() {
    dataEmitter.emit('update', {
        krakenBid: krakenBid?.price || null,
        krakenAsk: krakenAsk?.price || null,
        krakenBidVolume: krakenBidVolume || null,
        krakenAskVolume: krakenAskVolume || null,
        coinbaseBid,
        coinbaseAsk,
        coinbaseBidVolume,
        coinbaseAskVolume
    });
}

function connectCoinbase() {
    const ws = new WebSocket(COINBASE_WS_URL);
    ws.on('open', () => {
        console.log('Connected to Coinbase WebSocket');   
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'ticker',
            product_ids: COINBASE_PRODUCTS,
        }));
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'level2',
            product_ids: COINBASE_PRODUCTS,
        }));
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'heartbeats',
            product_ids: COINBASE_PRODUCTS,
        }));
    });
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if(data.channel === "l2_data" && data.events && data.events[0]) {
            const bookData = data.events[0].updates;
            bookData.forEach(update => {
                const book = update.side === 'bid' ? orderBook.bids : orderBook.asks;
                const price = update.price_level;
                const qty = parseFloat(update.new_quantity);
                if (qty === 0) {
                    book.delete(price); 
                } else {
                    book.set(price, qty); 
                }
            });
            if (orderBook.bids.size > 0 && orderBook.asks.size > 0) {
                coinbaseBid = Math.max(...Array.from(orderBook.bids.keys()).map(Number));
                coinbaseAsk = Math.min(...Array.from(orderBook.asks.keys()).map(Number));
                coinbaseBidVolume = orderBook.bids.get(String(coinbaseBid));
                coinbaseAskVolume = orderBook.asks.get(String(coinbaseAsk));
                console.log('Coinbase Order Book Update:');
                console.log(`Best Bid: ${coinbaseBid} Qty: ${coinbaseBidVolume}`);
                console.log(`Best Ask: ${coinbaseAsk} Qty: ${coinbaseAskVolume}`);
                console.log('---');
                emitDataUpdate();
            }
        }
    });
    ws.on('close', () => {
        console.log('Disconnected from Coinbase WebSocket');
        setTimeout(connectCoinbase, 5000);
    });
}

function connectKraken() {
    const ws = new WebSocket(KRAKEN_WS_URL);
        ws.on('open', () => {
            console.log('Connected to Kraken WebSocket');
            ws.send(JSON.stringify({
                method: 'subscribe',
                params: {"channel": 'ticker', "symbol": KRAKEN_PAIRS},
            }));
            ws.send(JSON.stringify({
                method: 'subscribe',
                params: {"channel": 'book', "symbol": KRAKEN_PAIRS},
            }));
        });
        ws.on('message', (msg) => {
            const data = JSON.parse(msg);
            if ((data.type === "snapshot") && data.data && data.data[0]) {
                const bookData = data.data[0];
                console.log("Kraken Order Book Snapshot");
                if (bookData.asks && bookData.asks.length > 0) {
                    krakenAsk = bookData.asks[0];
                    krakenAskVolume = krakenAsk.qty;
                    console.log("Best Ask Price:", krakenAsk.price);
                    console.log("Best Ask Volume:", krakenAskVolume);
                    console.log('---');
                    emitDataUpdate();
                }
                else if (bookData.bids && bookData.bids.length > 0) {
                    krakenBid = bookData.bids[0];
                    krakenBidVolume = krakenBid.qty;
                    console.log("Best Bid Price:", krakenBid.price);
                    console.log("Best Bid Volume:", krakenBidVolume);
                    console.log('---');
                    emitDataUpdate();
                }
            }
            else if(data.type === "update" && data.data && data.data[0]) {
                const bookData = data.data[0];
                console.log("Kraken Order Book Update");
                if (bookData.asks && bookData.asks.length > 0) {
                    krakenAsk = bookData.asks[0];
                    krakenAskVolume = krakenAsk.qty;
                    console.log("Best Ask Price:", krakenAsk.price);
                    console.log("Best Ask Volume:", krakenAskVolume);
                    console.log('---');
                    emitDataUpdate();
                }
                else if (bookData.bids && bookData.bids.length > 0) {
                    krakenBid= bookData.bids[0];
                    krakenBidVolume = krakenBid.qty;
                    console.log("Best Bid Price:", krakenBid.price);
                    console.log("Best Bid Volume:", krakenBidVolume);
                    console.log('---');
                    emitDataUpdate();
                }
            }
            else if(data.type === "ticker" && data.data) {
                const tickerData = data.data;
                console.log("Kraken Ticker Update");
                console.log("Last Trade Price:", tickerData.last);
                console.log("Volume:", tickerData.volume);
                console.log('---');
            }
        });
        ws.on('close', () => {
            console.log('Disconnected from Kraken WebSocket');
            setTimeout(connectKraken, 5000);
        });
}

function main(){
    console.log("Starting unified exchange data websocket connections...");
    connectCoinbase();
    connectKraken();
}
main();