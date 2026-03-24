import WebSocket from 'ws';

const EXCHANGE = 'KRAKEN';
const FEE = 0.0026; // 0.26% for Kraken taker fees
const MIN_PROFIT_THRESHOLD = 0.1; 
const START_AMOUNT = 1000000; 

const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';
const KRAKEN_PAIRS = ['BTC/USD', 'ETH/USD', 'ETH/BTC'];

const COINBASE_WS_URL = 'wss://advanced-trade-ws.coinbase.com';
const COINBASE_PAIRS = ['BTC-USD', 'ETH-USD', 'ETH-BTC'];


const prices = {
    'BTC/USD': { bid: null, ask: null, bidVolume: null, askVolume: null },
    'ETH/USD': { bid: null, ask: null, bidVolume: null, askVolume: null },
    'ETH/BTC': { bid: null, ask: null, bidVolume: null, askVolume: null }
};

function calculateTriangularArbitrage() {
    if (!prices['BTC/USD'].bid || !prices['ETH/USD'].bid || !prices['ETH/BTC'].bid ||
        !prices['BTC/USD'].ask || !prices['ETH/USD'].ask || !prices['ETH/BTC'].ask) {
        return;
    }
    
    let cycle1 = START_AMOUNT;
    
    cycle1 = cycle1 / prices['BTC/USD'].ask; 
    cycle1 = cycle1 * (1 - FEE); 
    
    cycle1 = cycle1 / prices['ETH/BTC'].ask; 
    cycle1 = cycle1 * (1 - FEE); 
    
    cycle1 = cycle1 * prices['ETH/USD'].bid; 
    cycle1 = cycle1 * (1 - FEE); 
    
    const profit1 = cycle1 - START_AMOUNT;
    const profitPercent1 = (profit1 / START_AMOUNT) * 100;
    
    let cycle2 = START_AMOUNT;
    
    cycle2 = cycle2 / prices['ETH/USD'].ask; 
    cycle2 = cycle2 * (1 - FEE); 
    
    cycle2 = cycle2 * prices['ETH/BTC'].bid; 
    cycle2 = cycle2 * (1 - FEE); 
    
    cycle2 = cycle2 * prices['BTC/USD'].bid; 
    cycle2 = cycle2 * (1 - FEE); 
    
    const profit2 = cycle2 - START_AMOUNT;
    const profitPercent2 = (profit2 / START_AMOUNT) * 100;
    
    console.clear();
    console.log('='.repeat(60));
    console.log(`TRIANGULAR ARBITRAGE SCANNER - ${EXCHANGE}`);
    console.log('='.repeat(60));
    console.log(`Starting Amount: $${START_AMOUNT.toFixed(2)}`);
    console.log(`Trading Fee: ${(FEE * 100).toFixed(2)}% per trade`);
    console.log(`Total Fee Cost: ${(FEE * 3 * 100).toFixed(2)}% (3 trades)`);
    console.log('='.repeat(60));
    
    console.log('\nCURRENT PRICES:');
    console.log(`BTC/USD - Bid: $${prices['BTC/USD'].bid?.toFixed(2)} | Ask: $${prices['BTC/USD'].ask?.toFixed(2)}`);
    console.log(`ETH/USD - Bid: $${prices['ETH/USD'].bid?.toFixed(2)} | Ask: $${prices['ETH/USD'].ask?.toFixed(2)}`);
    console.log(`ETH/BTC - Bid: ${prices['ETH/BTC'].bid?.toFixed(6)} | Ask: ${prices['ETH/BTC'].ask?.toFixed(6)}`);
    
    console.log('\n' + '-'.repeat(60));
    console.log('CYCLE 1: USD to BTC to ETH to USD');
    console.log('-'.repeat(60));
    console.log(`Path: Buy BTC to Buy ETH to Sell ETH`);
    console.log(`Final Amount: $${cycle1.toFixed(2)}`);
    console.log(`Profit/Loss: $${profit1.toFixed(2)} (${profitPercent1.toFixed(4)}%)`);
    
    if (profitPercent1 > MIN_PROFIT_THRESHOLD) {
        console.log('ARBITRAGE OPPORTUNITY DETECTED!');
    } else if (profitPercent1 > 0) {
        console.log('Small profit (below threshold)');
    } else {
        console.log('No opportunity');
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log('CYCLE 2: USD to ETH to BTC to USD');
    console.log('-'.repeat(60));
    console.log(`Path: Buy ETH to Buy BTC to Sell BTC`);
    console.log(`Final Amount: $${cycle2.toFixed(2)}`);
    console.log(`Profit/Loss: $${profit2.toFixed(2)} (${profitPercent2.toFixed(4)}%)`);
    
    if (profitPercent2 > MIN_PROFIT_THRESHOLD) {
        console.log('ARBITRAGE OPPORTUNITY DETECTED!');
    } else if (profitPercent2 > 0) {
        console.log('Small profit (below threshold)');
    } else {
        console.log('No opportunity');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Updated: ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(60) + '\n');
}

function connectKraken() {
    const ws = new WebSocket(KRAKEN_WS_URL);
    
    ws.on('open', () => {
        console.log('Connected to Kraken WebSocket');
        
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
            calculateTriangularArbitrage();
        }
    });
    ws.on('close', () => {
        console.log('Disconnected from Kraken. Reconnecting in 5s...');
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
        console.log(' Connected to Coinbase WebSocket');
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
                calculateTriangularArbitrage();
            }
        }
    });
    ws.on('close', () => {
        console.log(' Disconnected from Coinbase. Reconnecting in 5s...');
        setTimeout(connectCoinbase, 5000);
    });
    ws.on('error', (err) => {
        console.error('Coinbase WebSocket error:', err.message);
    });
}

console.log(`Starting Triangular Arbitrage Scanner on ${EXCHANGE}...\n`);

if (EXCHANGE === 'KRAKEN') {
    connectKraken();
} else if (EXCHANGE === 'COINBASE') {
    connectCoinbase();
} else {
    console.error(' Invalid exchange. Choose KRAKEN or COINBASE');
    process.exit(1);
}