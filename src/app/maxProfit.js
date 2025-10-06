var maxProfit = function(prices) {
    let buy=Infinity;
    let sell= 0;
    for (let i = 0; i < prices.length; i++) {
        if (prices[i]<buy) {
            buy=prices[i];
        } else if (prices[i]>sell) {
            sell=prices[i]
        }
        
    }
    return `${buy},${sell}`
};
prices = [7,1,5,3,6,4]
console.log(maxProfit(prices))