// eslint-disable-next-line import/no-extraneous-dependencies
import Web3 from 'web3';
// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';

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
 * Returns a globally available Web3 class.
 * @type {Web3}
 */
export const Web3Utils = Web3;

/**
 * Returns the chain Id of the network
 * @type {function(): Promise<number>}
 */
export const getEventualChainId = () => web3.eth.getChainId();

/**
 *
 * @param contract
 * @param eventName
 * @returns {Object}
 */
export const getEventJsonInterface = (contract, eventName) => web3.utils._.find(
  contract.options.jsonInterface,
  (element) => element.name === eventName && element.type === 'event',
);

/**
 * Returns a globally available Big Number library
 * @type {BigNumber}
 */
export const BN = BigNumber;

const internalSend = (signature, from) => new Promise((resolve, reject) => {
  signature.estimateGas({ from })
    .then((gas) => signature.send({
      from,
      gas,
    }))
    .then(resolve)
    .catch(reject);
});

/**
 * Will send a transaction to the smart contract and execute its method. Note this can alter
 * the smart contract state.
 * @param {Object} signature
 * @param {string=} from if specified the transaction will be executed with from this address
 * @return {Promise<TXResult>}
 */
export const send = (signature, from = '') => new Promise((resolve, reject) => {
  if (from) {
    internalSend(signature, from)
      .then(resolve)
      .catch(reject);
  } else {
    web3.eth.getAccounts()
      .then(([account]) => internalSend(signature, account))
      .then(resolve)
      .catch(reject);
  }
});

/**
 * @constant
 * @type {string}
 */
export const PERIOD_DAY = 'day';

/**
 * @constant
 * @type {string}
 */
export const PERIOD_WEEK = 'week';

/**
 * @constant
 * @type {string}
 */
export const PERIOD_MONTH = 'month';

/**
 * @constant
 * @type {string}
 */
export const PERIOD_YEAR = 'year';
