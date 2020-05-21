import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';

import Market from '../src';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Market handler', () => {
  context('Initialization', () => {
    it('should throw an error if no instance address is passed');
  })
  context('Creation', () => {
    it('should throw an error if neither the token address nor the base borrow rate are set');
    it('should throw an error if it gets a no-token address');
    it('should be linked to a controller');
  });
});
