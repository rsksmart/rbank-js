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
    await market1.setControllerAddress(controller._address);

    const addMarketSignature = controller.methods.addMarket(market1Address);
    const addMarketGas = await addMarketSignature.estimateGas({ from: owner });
    await addMarketSignature.send({ from: owner, gas: addMarketGas });
    const marketPriceSignature = controller.methods.setPrice(market1Address, 10);
    const marketPriceGas = await marketPriceSignature.estimateGas({ from: owner });
    await marketPriceSignature.send({ from: owner, gas: marketPriceGas });
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
      await token2.methods.allocateTo(user2, 500).send({ from: user2 });

      const addMarket2Signature = controller.methods.addMarket(market2._address);
      const addMarket2Gas = await addMarket2Signature.estimateGas({ from: owner });
      await addMarket2Signature.send({ from: owner, gas: addMarket2Gas });
      const market2PriceSignature = controller.methods.setPrice(market2._address, 10);
      const market2PriceGas = await market2PriceSignature.estimateGas({ from: owner });
      await market2PriceSignature.send({ from: owner, gas: market2PriceGas });
      await market2.setControllerAddress(controller._address);
    });
    it('should throws an error if there is not enough eventualBalance to supply into a market', () => {
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
    it('should show zero as eventualBalance for an account that has not supplied tokens yet', () => {
      return market1.supplyOf(user2)
        .then(balance => {
          expect(balance).to.eq(0);
        });
    });
    it('should show the value supplied by a user in the market', () => {
      return market1.supply(250, user1)
        .then(() => market1.supplyOf(user1))
        .then(balance => {
          expect(balance).to.eq(250);
        });
    });
    it('should show the value supplied by the current account in the market', () => {
      return market1.supply(300)
        .then(() => market1.supplyOf())
        .then(balance => {
          expect(balance).to.eq(300);
        });
    });
    it('should throw an error when borrowing from a market that has not been supplied', () => {
      return expect(market1.borrow(200, user2)).to.be.eventually.rejected;
    });
    it('should throw an error when a user wants to borrow but has no collateral', () => {
      return market1.supply(250, user1)
        .then(() => {
          expect(market1.borrow(100, user2)).to.be.eventually.rejected;
        });
    });
    it('should return the eventualBalance of a supplied market', () => {
      return market1.supply(250, user1)
        .then(() => market1.eventualBalance)
        .then(balance => {
          expect(balance).to.eq(250);
        });
    });
    it('should allow a second user borrowing from what was supplied by a first one', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(20, user2))
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
          return market1.eventualBalance;
        })
        .then(balance => {
          expect(balance).to.eq(230);
        });
    });
    it('should allow a second user to pay a borrowed amount');
    it('should allow a first user to redeem tokens previously supplied into the market');
    it('should throw an error on redeem if there is not enough supplied amount from the user');
    it('should allow anyone to get the updatedSupplyOf value of any account');
    it('should allow anyone to get the updatedBorrowedBy value of any account');
    it('should allow anyone to get the current Market eventualBalance in its token terms');
  });
});
