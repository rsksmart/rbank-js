import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import FaucetTokenContract from '../../../dependencies/DeFiProt/build/contracts/FaucetToken.json';
import ControllerContract from '../../../dependencies/DeFiProt/build/contracts/Controller.json';
import Market from '../src';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Market handler', () => {
  let controller;
  let token;
  let token1;
  let market1;
  let market1Address;
  beforeEach(async () => {
    const [owner] = await web3.eth.getAccounts();
    const controllerContract = new web3.eth.Contract(ControllerContract.abi);
    const controllerDeploy = controllerContract.deploy({
      data: ControllerContract.bytecode,
      arguments: [],
    });
    const controllerGas = await controllerDeploy.estimateGas({ from: owner });
    controller = await controllerDeploy.send({ from: owner, gas: controllerGas });

    token = new web3.eth.Contract(FaucetTokenContract.abi);
    const deployToken1 = token.deploy({
      data: FaucetTokenContract.bytecode,
      arguments: [10000, 'TOK1', 0, 'TOK1'],
    });
    const gasToken1 = await deployToken1.estimateGas({ from: owner });
    token1 = await deployToken1.send({ from: owner, gas: gasToken1 });
    market1Address = await Market.create(token1._address, 10);
    market1 = new Market(market1Address);
  });
  context('Creation', () => {
    it('should throw an error no token address is set', () => {
      return expect(Market.create()).to.be.eventually.rejected;
    });
    it('should throw an error if no base borrow rate is set', () => {
      return expect(Market.create(token1._address)).to.be.eventually.rejected;
    });
    it('should throw an error if an empty token address is set', () => {
      return expect(Market.create('', 10)).to.be.eventually.rejected;
    });
    it('should throw an error if it gets a no-token address', () => {
      return expect(Market.create(controller._address, 10))
        .to.be.eventually.rejected;
    });
    it('should returns the market contract address after creation', () => {
      return Market.create(token1._address, 10)
        .then(marketAddress => {
          expect(marketAddress).to.match(/0x[a-fA-F0-9]{40}/);
        });
    });
    it('should get the instance smart contract address', () => {
      return expect(market1.address).to.eq(market1Address);
    });
  });
  context('Initialization', () => {
    it('should throw an error if no instance address is passed', () => {
      return expect(new Market()).to.be.an('error');
    });
    it('should return a valid market instance after passing a valid market address', () => {
      return Market.create(token1._address, 10)
        .then(marketAddress => {
          expect(new Market(marketAddress)).not.be.an('error');
        });
    });
    it('should be linked to a controller', () => {
      return market1.setControllerAddress(controller._address)
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
          return true;
        })
        .then(() => market1.eventualController)
        .then(resolvedController => {
          expect(resolvedController).to.eq(controller._address);
        });
    });
    it('should have the same borrow rate from its creation', () => {
      return market1.eventualBaseBorrowRate
        .then(baseBorrowRate => {
          expect(baseBorrowRate).to.eq(10);
        });
    });
  });
  context('Operational', () => {
    let owner, user1, user2, user3, user4;
    let token2;
    let market2;
    beforeEach(async () => {
      [owner, user1, user2, user3, user4] = await web3.eth.getAccounts();

      const deployToken2 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK2', 0, 'TOK2'],
      });
      const gasToken2 = await deployToken2.estimateGas({ from: owner });
      token2 = await deployToken2.send({ from: owner, gas: gasToken2 });
      market2 = new Market(await Market.create(token2._address, 10));

      await token1.methods.allocateTo(user1, 500).send({ from: user1 });
    });
    it('should throws an error if there is not enough balance to supply into a market', () => {
      return expect(market1.supply(250, user2)).to.be.eventually.rejected;
    });
    it('should allow the current and funded user to supply into the market', () => {
      const t1Allocate = token1.methods.allocateTo(owner, 500);
      return t1Allocate.estimateGas({ from: owner })
        .then(gas => t1Allocate.send({ from: owner, gas }))
        .then(() => market1.supply(250))
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
        });
    });
    it('should allow any user to supply token to the market', () => {
      return market1.supply(250, user1)
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
        });
    });
    it('should allow a second user borrowing from what was supplied by a first one');
    it('should allow a second user to pay a borrowed amount');
    it('should allow a first user to redeem tokens previously supplied into the market');
    it('should throw an error on redeem if there is not enough supplied amount from the user');
    it('should allow anyone to get the updatedSupplyOf value of any account');
    it('should allow anyone to get the updatedBorrowedBy value of any account');
    it('should allow anyone to get the current Market balance in its token terms');
  });
});
