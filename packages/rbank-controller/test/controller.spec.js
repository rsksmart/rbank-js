import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import FaucetTokenContract from '../../../dependencies/DeFiProt/build/contracts/FaucetToken.json';
import Controller from '../src/controller';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Controller handler', () => {
  let controller;
  beforeEach(async () => {
    controller = new Controller(await Controller.create());
  });
  context('Initialization', () => {
    it('should get an error when initializing without controller address', () => {
      expect(new Controller()).to.be.an('error');
    });
    it('should get a new instance using the controller registered address', () => {
      expect(controller).not.to.be.an('error');
    });
    it('should get zero collateral factor', () => {
      return controller.eventualCollateralFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
    it('should get zero collateral factor', () => {
      return controller.eventualLiquidationFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
    it('should allow the controller owner to set a new collateral factor', () => {
      return controller.setCollateralFactor(2)
        .then(() => controller.eventualCollateralFactor)
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(2);
        });
    });
    it('should allow the controller owner to set a new liquidation factor', () => {
      return controller.setLiquidationFactor(3)
        .then(() => controller.eventualLiquidationFactor)
        .then(liquidationFactor => {
          expect(liquidationFactor).to.eq(3);
        });
    });
  });
  context('Market management', () => {
    let token1;
    let token2;
    let token3;
    beforeEach(async () => {

      const token = new web3.eth.Contract(FaucetTokenContract.abi);
      const [owner, from] = await web3.eth.getAccounts();

      const deploy1 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK1', 0, 'TOK1'],
      });
      const gas1 = await deploy1.estimateGas({ from: owner });
      token1 = await deploy1.send({ from: owner, gas: gas1 });

      const deploy2 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK2', 0, 'TOK2'],
      });
      const gas2 = await deploy2.estimateGas({ from });
      token2 = await deploy2.send({ from, gas: gas2 });

      const deploy3 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK3', 0, 'TOK3'],
      });
      const gas3 = await deploy3.estimateGas({ from });
      token3 = await deploy3.send({ from, gas: gas3 });
    });
    it('should have zero markets in the beginning', () => {
      return controller.eventualMarketListSize
        .then(marketListSize => {
          expect(marketListSize).to.eq(0);
        });
    });
    it('should allow the controller owner to add new markets', () => {
      return controller.addMarket(token1._address)
        .then(() => controller.eventualMarketListSize)
        .then(marketListSize => {
          expect(marketListSize).to.eq(1);
        });
    });
  });
});
