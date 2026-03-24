import { dataEmitter } from '../exchange-data-websocket/unifier.js';

let krakenFees = 0.0026; 
let coinbaseFees = 0.005; 

let totalFees = krakenFees + coinbaseFees; 

function calculateArbitrage(data) {
    if (!data.krakenBid || !data.krakenAsk || !data.coinbaseBid || !data.coinbaseAsk) {
        console.log("Waiting for complete market data...");
        return;
    }

    const startAmount = 10000;
    
    console.clear();
    console.log('='.repeat(70));
    console.log('CROSS-EXCHANGE ARBITRAGE SCANNER');
    console.log('='.repeat(70));
    console.log(`Starting Amount: $${startAmount.toFixed(2)}`);
    console.log(`Kraken Fees: ${(krakenFees * 100).toFixed(2)}% | Coinbase Fees: ${(coinbaseFees * 100).toFixed(2)}%`);
    console.log(`Total Round-Trip Fees: ${(totalFees * 100).toFixed(2)}%`);
    console.log('='.repeat(70));
    
    console.log('\nCURRENT MARKET PRICES:');
    console.log(`Kraken  - Bid: $${data.krakenBid} (Vol: ${data.krakenBidVolume}) | Ask: $${data.krakenAsk} (Vol: ${data.krakenAskVolume})`);
    console.log(`Coinbase - Bid: $${data.coinbaseBid} (Vol: ${data.coinbaseBidVolume}) | Ask: $${data.coinbaseAsk} (Vol: ${data.coinbaseAskVolume})`);
    
    console.log('\n' + '-'.repeat(70));
    console.log('OPPORTUNITY 1: Buy on Kraken to Sell on Coinbase');
    console.log('-'.repeat(70));
    
    let amount1 = startAmount;
    const buyPrice1 = data.krakenAsk;
    const sellPrice1 = data.coinbaseBid; 
    
    amount1 = amount1 / buyPrice1; 
    amount1 = amount1 * (1 - krakenFees); 
    const btcAmount1 = amount1;
    
    amount1 = amount1 * sellPrice1; 
    amount1 = amount1 * (1 - coinbaseFees); 
    
    const profit1 = amount1 - startAmount;
    const profitPercent1 = (profit1 / startAmount) * 100;
    const priceSpread1 = ((sellPrice1 - buyPrice1) / buyPrice1) * 100;
    
    console.log(`Buy Price (Kraken):  $${buyPrice1}`);
    console.log(`Sell Price (Coinbase): $${sellPrice1}`);
    console.log(`Price Spread: ${priceSpread1.toFixed(4)}%`);
    console.log(`BTC Amount: ${btcAmount1.toFixed(8)} BTC`);
    console.log(`Final Amount: $${amount1.toFixed(2)}`);
    console.log(`Net Profit/Loss: $${profit1.toFixed(2)} (${profitPercent1.toFixed(4)}%)`);
    
    if (profitPercent1 > 0.1) {
        console.log('PROFITABLE ARBITRAGE OPPORTUNITY!');
    } else if (profitPercent1 > 0) {
        console.log('Marginal profit (high risk)');
    } else {
        console.log('No opportunity - Loss after fees');
    }
    
    console.log('\n' + '-'.repeat(70));
    console.log('OPPORTUNITY 2: Buy on Coinbase to Sell on Kraken');
    console.log('-'.repeat(70));
    
    let amount2 = startAmount;
    const buyPrice2 = data.coinbaseAsk; 
    const sellPrice2 = data.krakenBid; 
    
    amount2 = amount2 / buyPrice2; 
    amount2 = amount2 * (1 - coinbaseFees); 
    const btcAmount2 = amount2;
    
    amount2 = amount2 * sellPrice2; 
    amount2 = amount2 * (1 - krakenFees); 
    
    const profit2 = amount2 - startAmount;
    const profitPercent2 = (profit2 / startAmount) * 100;
    const priceSpread2 = ((sellPrice2 - buyPrice2) / buyPrice2) * 100;
    
    console.log(`Buy Price (Coinbase): $${buyPrice2}`);
    console.log(`Sell Price (Kraken):  $${sellPrice2}`);
    console.log(`Price Spread: ${priceSpread2.toFixed(4)}%`);
    console.log(`BTC Amount: ${btcAmount2.toFixed(8)} BTC`);
    console.log(`Final Amount: $${amount2.toFixed(2)}`);
    console.log(`Net Profit/Loss: $${profit2.toFixed(2)} (${profitPercent2.toFixed(4)}%)`);
    
    if (profitPercent2 > 0.1) {
        console.log('PROFITABLE ARBITRAGE OPPORTUNITY!');
    } else if (profitPercent2 > 0) {
        console.log('Marginal profit (high risk)');
    } else {
        console.log('No opportunity - Loss after fees');
    }
    
    console.log('\n' + '='.repeat(70));
    const bestProfit = Math.max(profit1, profit2);
    const bestPercent = Math.max(profitPercent1, profitPercent2);
    const bestDirection = profit1 > profit2 ? 'Kraken to Coinbase' : 'Coinbase to Kraken';
    
    if (bestProfit > 0) {
        console.log(`BEST OPPORTUNITY: ${bestDirection}`);
        console.log(`Potential Profit: $${bestProfit.toFixed(2)} (${bestPercent.toFixed(4)}%)`);
    } else {
        console.log('NO PROFITABLE OPPORTUNITIES AT THIS TIME');
    }
    
    console.log(`Updated: ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(70) + '\n');
}

function main() {
    console.log("Starting cross-exchange arbitrage scanner...");
    console.log("Listening for market data updates...");
    console.log('---\n');

    dataEmitter.on('update', (data) => {
        calculateArbitrage(data);
    });
}

main();