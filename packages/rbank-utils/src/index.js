// eslint-disable-next-line import/no-extraneous-dependencies
import Web3 from 'web3';
// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';

const localWS = 'ws://127.0.0.1:8545';
const rskMainNetWS = '';
const rskTestNetWS = 'wss://public-node.testnet.rsk.co:4445/websocket';
const rskRegTestWS = '';

const getWSProvider = () => {
  try {
    switch (Web3.utils.toDecimal(Web3.givenProvider.chainId)) {
      case 30:
        return rskMainNetWS;
      case 31:
        return rskTestNetWS;
      case 33:
        return rskRegTestWS;
      default:
        return localWS;
    }
  } catch (e) {
    return localWS;
  }
};

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
 * Returns a globally available we3 websocket instance connected to the correspondent http given
 * provider or a ganache local network by default.
 * @type {Web3}
 */
export const web3WS = new Web3(getWSProvider());

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
