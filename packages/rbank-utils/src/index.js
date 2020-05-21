import Web3 from 'web3';

/**
 * A blockchain transaction response.
 * @typedef {Object} TXResult
 */

/**
 * Returns a globally available web3 instance connected to the given provider or a ganache local
 * network by default.
 * @type {Web3}
 */
export const web3 = new Web3(Web3.givenProvider || 'http://127.0.0.1:8545');

/**
 * Will send a transaction to the smart contract and execute its method. Note this can alter
 * the smart contract state.
 * @param {Object} signature
 * @return {Promise<TXResult>}
 */
export const send = (signature) => new Promise((resolve, reject) => {
  web3.eth.getAccounts()
    .then(([from]) => [from, signature.estimateGas({ from })])
    .then(promises => Promise.all(promises))
    .then(([from, gas]) => signature.send({ from, gas }))
    .then(resolve)
    .catch(reject);
})
