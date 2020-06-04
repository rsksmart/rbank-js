import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import Rbank from '../src';
import Controller from '@rsksmart/rbank-controller';
import Market from '@rsksmart/rbank-market';
import Token from '../../rbank-market/src/FaucetToken.json';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Core', () => {
  let rbank;
  beforeEach(async () => {
    rbank = new Rbank();
  });
  context('Packages independence', () => {
    it('should have access to the controller handler', () => {
      return expect(rbank.Controller).to.eq(Controller);
    });
    it('should have access to the market handler', () => {
      return expect(rbank.Market).to.eq(Market);
    });
  });
  context('Operational', () => {
    let controller;
    let market1, market2, market3, market4;
    beforeEach(async () => {
      const [owner] = await web3.eth.getAccounts();

      const token = new web3.eth.Contract(Token.abi);

      const deployToken1 = token.deploy({
        data: Token.bytecode,
        arguments: [100000, 'TOK1', 0, 'TOK1'],
      });
      const deployToken2 = token.deploy({
        data: Token.bytecode,
        arguments: [100000, 'TOK2', 0, 'TOK2'],
      });
      const deployToken3 = token.deploy({
        data: Token.bytecode,
        arguments: [100000, 'TOK3', 0, 'TOK3'],
      });
      const deployToken4 = token.deploy({
        data: Token.bytecode,
        arguments: [100000, 'TOK4', 0, 'TOK4'],
      });

      const gasToken1 = await deployToken1.estimateGas({ from: owner });
      const gasToken2 = await deployToken2.estimateGas({ from: owner });
      const gasToken3 = await deployToken3.estimateGas({ from: owner });
      const gasToken4 = await deployToken4.estimateGas({ from: owner });

      const token1 = await deployToken1.send({ from: owner, gas: gasToken1 });
      const token2 = await deployToken2.send({ from: owner, gas: gasToken2 });
      const token3 = await deployToken3.send({ from: owner, gas: gasToken3 });
      const token4 = await deployToken4.send({ from: owner, gas: gasToken4 });

      controller = new Controller(await Controller.create());

      market1 = new Market(await Market.create(token1._address, 10));
      market2 = new Market(await Market.create(token2._address, 10));
      market3 = new Market(await Market.create(token3._address, 10));
      market4 = new Market(await Market.create(token4._address, 10));

      await controller.addMarket(market1.instanceAddress);
      await controller.addMarket(market2.instanceAddress);
      await controller.addMarket(market3.instanceAddress);
      await controller.addMarket(market4.instanceAddress);

      await market1.setControllerAddress(controller.address);
      await market2.setControllerAddress(controller.address);
      await market3.setControllerAddress(controller.address);
      await market4.setControllerAddress(controller.address);

      rbank.controller = controller.address;
    });
    it('should create a controller instance assigning the controller address', () => {
      return expect(rbank.controller.address).to.eq(controller.address);
    });
    it('should create as many instances of markets as markets registered in the controller', () => {
      return rbank.eventualMarkets
        .then(markets => {
          expect(markets.length).to.eq(4);
        });
    });
    it('should retrieve a market instance by its address', () => {
      return rbank.eventualMarket(market3.address)
        .then(market => {
          expect(market.address).to.eq(market3.address);
        });
    });
    it('should retrieve a market instance by its index', () => {
      return rbank.eventualMarket(1)
        .then(market => {
          expect(market.address).to.eq(market2.address);
        });
    });
  });
});
