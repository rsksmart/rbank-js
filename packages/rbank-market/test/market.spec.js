import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import FaucetTokenContract from '../../../dependencies/DeFiProt/build/contracts/FaucetToken.json';
import ControllerContract from '../../../dependencies/DeFiProt/build/contracts/Controller.json';
import MarketContract from '../../../dependencies/DeFiProt/build/contracts/Market.json';
import Market from '../src';

const web3 = new Web3('http://127.0.0.1:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Market handler', () => {
  let controller;
  let token;
  let token1;
  let market1;
  let market1Address;
  let owner,
    alice;
  beforeEach(async () => {
    [owner, alice] = await web3.eth.getAccounts();
    const controllerContract = new web3.eth.Contract(ControllerContract.abi);
    const controllerDeploy = controllerContract.deploy({
      data: ControllerContract.bytecode,
      arguments: [],
    });
    const controllerGas = await controllerDeploy.estimateGas({ from: owner });
    controller = await controllerDeploy.send({
      from: owner,
      gas: controllerGas,
    });

    token = new web3.eth.Contract(FaucetTokenContract.abi);
    const deployToken1 = token.deploy({
      data: FaucetTokenContract.bytecode,
      arguments: [10000, 'TOK1', 0, 'TOK1'],
    });
    const gasToken1 = await deployToken1.estimateGas({ from: owner });
    token1 = await deployToken1.send({
      from: owner,
      gas: gasToken1,
    });
    market1Address = await Market.create(
      token1._address,
      2,
      1e6,
      20,
    );
    market1 = new Market(market1Address);
    await market1.setControllerAddress(controller._address);

    const addMarketSignature = controller.methods.addMarket(market1Address);
    const addMarketGas = await addMarketSignature.estimateGas({ from: owner });
    await addMarketSignature.send({
      from: owner,
      gas: addMarketGas,
    });
    const marketPriceSignature = controller.methods.setPrice(market1Address, 10);
    const marketPriceGas = await marketPriceSignature.estimateGas({ from: owner });
    await marketPriceSignature.send({
      from: owner,
      gas: marketPriceGas,
    });
  });
  context('Token availability', () => {
    it('should have access to the Token handler', () => {
      return expect(Market.Token.toString())
        .to
        .match(/Token/);
    });
    it('should get the token instance', () => {
      return market1.eventualToken
        .then((token) => {
          expect(token.address)
            .to
            .eq(token1._address.toLowerCase());
        });
    });
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
      return Market.create(token1._address, 2, 1e6, 20)
        .then(marketAddress => {
          expect(marketAddress)
            .to
            .match(/0x[a-f0-9]{40}/);
        });
    });
    it('should get the instance smart contract address', () => {
      return expect(market1.address)
        .to
        .eq(market1Address);
    });
    it('should create an instance of a Market and get the market address lower cased', () => {
      const MarketSC = new web3.eth.Contract(MarketContract.abi);
      const deployMarket = MarketSC.deploy({
        data: MarketContract.bytecode,
        arguments: [
          token1._address.toLowerCase(),
          2,
          1e6,
          20,
        ],
      });
      return deployMarket.estimateGas({ from: owner })
        .then((gas) => deployMarket.send({
          from: owner,
          gas,
        }))
        .then((instance) => instance._address)
        .then((marketAddress) => [marketAddress, new Market(marketAddress)])
        .then(([marketAddress, marketInstance]) => {
          expect(marketInstance.address)
            .to
            .eq(marketAddress.toLowerCase());
        });
    });
  });
  context('Initialization', () => {
    it('should throw an error if no instance address is passed', () => {
      return expect(new Market())
        .to
        .be
        .an('error');
    });
    it('should return a valid market instance after passing a valid market address', () => {
      return Market.create(token1._address, 2, 1e6, 20)
        .then(marketAddress => {
          expect(new Market(marketAddress))
            .not
            .be
            .an('error');
        });
    });
    it('should return the lower cased market address from the instance', () => {
      return Market.create(token1._address, 2, 1e6, 20)
        .then(marketAddress => {
          expect(marketAddress)
            .to
            .match(/0x[a-f0-9]{40}/);
        });
    });
    it('should return a the blocks per year of a market', () => {
      return Market.create(token1._address, 2, 1e6, 20)
        .then((marketAddress) => new Market(marketAddress).eventualBlocksPerYear)
        .then((blocksPerYear) => {
          expect(blocksPerYear)
            .to
            .eq(1e6);
        });
    });
    it('should be linked to a controller', () => {
      return market1.setControllerAddress(controller._address)
        .then(result => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return true;
        })
        .then(() => market1.eventualController)
        .then(resolvedController => {
          expect(resolvedController)
            .to
            .eq(controller._address);
        });
    });
  });
  context('Operational', () => {
    let owner,
      user1,
      user2,
      user3,
      user4,
      user5;
    let token2;
    let market2;
    beforeEach(async () => {
      [owner, user1, user2, user3, user4, user5] = await web3.eth.getAccounts();

      const deployToken2 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK2', 0, 'TOK2'],
      });
      const gasToken2 = await deployToken2.estimateGas({ from: owner });
      token2 = await deployToken2.send({
        from: owner,
        gas: gasToken2,
      });
      market2 = new Market(await Market.create(
        token2._address,
        2,
        1e6,
        20,
      ));

      await token1.methods.allocateTo(user1, 1000)
        .send({ from: user1 });
      await token2.methods.allocateTo(user2, 1000)
        .send({ from: user2 });

      const addMarket2Signature = controller.methods.addMarket(market2.instanceAddress);
      const addMarket2Gas = await addMarket2Signature.estimateGas({ from: owner });
      await addMarket2Signature.send({
        from: owner,
        gas: addMarket2Gas,
      });
      const market2PriceSignature = controller.methods.setPrice(market2.instanceAddress, 10);
      const market2PriceGas = await market2PriceSignature.estimateGas({ from: owner });
      await market2PriceSignature.send({
        from: owner,
        gas: market2PriceGas,
      });
      await market2.setControllerAddress(controller._address);
    });
    it('should get the market address lower cased', () => {
      return expect(market1.address)
        .to
        .match(/0x[a-f0-9]/);
    });
    it('should return the FACTOR constant of a market', () => {
      return market1.eventualFactor
        .then((factor) => {
          expect(factor)
            .to
            .eq(1e18);
        });
    });
    it('should throws an error if there is not enough eventualBalance to supply into a market', () => {
      return expect(market1.supply(250, user2)).to.be.eventually.rejected;
    });
    it('should allow the current and funded user to supply into the market', () => {
      const t1Allocate = token1.methods.allocateTo(owner, 500);
      return t1Allocate.estimateGas({ from: owner })
        .then(gas => t1Allocate.send({
          from: owner,
          gas,
        }))
        .then(() => market1.supply(250))
        .then(result => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should allow any user to supply token to the market', () => {
      return market1.supply(250, user1)
        .then(result => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should show zero as eventualBalance for an account that has not supplied tokens yet', () => {
      return market1.supplyOf(user2)
        .then(balance => {
          expect(balance)
            .to
            .eq(0);
        });
    });
    it('should show the value supplied by a user in the market', () => {
      return market1.supply(250, user1)
        .then(() => market1.supplyOf(user1))
        .then(balance => {
          expect(balance)
            .to
            .eq(250);
        });
    });
    it('should show the value supplied by the current account in the market', () => {
      return market1.supply(300)
        .then(() => market1.supplyOf())
        .then(balance => {
          expect(balance)
            .to
            .eq(300);
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
    it('should allow a second user borrowing from what was supplied by a first one', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(20, user2))
        .then(result => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualCash;
        })
        .then((cash) => {
          expect(cash)
            .to
            .eq(230);
        });
    });
    it('should return the value that the user borrowed from the market', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(20, user2))
        .then(() => market1.borrowBy(user2))
        .then((borrowBy) => {
          expect(borrowBy)
            .to
            .eq(20);
        });
    });
    it('should get the borrow rate depending on the market borrow transactions', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(20, user2))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualBorrowRate;
        })
        .then((borrowRate) => {
          expect(borrowRate)
            .to
            .eq(3.6);
        });
    });
    it('should get the initial borrow rate of the market', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(20, user2))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualBaseBorrowRate;
        })
        .then((borrowRate) => {
          expect(borrowRate)
            .to
            .eq(2);
        });
    });
    it('should return the updated total supplies of a market', () => {
      return market1.supply(250, user1)
        .then(() => token1.methods.allocateTo(user5, 1000)
          .send({ from: user1 }))
        .then(() => market1.supply(1000, user5))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualUpdatedTotalSupply;
        })
        .then((updatedTotalSupply) => {
          expect(updatedTotalSupply)
            .to
            .eq(1250);
        });
    });
    it('should return the updated total borrows of a market', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(50, user2))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualUpdatedTotalBorrows;
        })
        .then((updatedTotalBorrow) => {
          expect(updatedTotalBorrow)
            .to
            .eq(50);
        });
    });
    it('should return the cash of a market', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(50, user2))
        .then(result => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
          return market1.eventualCash;
        })
        .then((cash) => {
          expect(cash)
            .to
            .eq(200);
        });
    });
    it('should allow a second user to pay a borrowed amount', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(50, user2))
        .then(() => market1.payBorrow(10, user2))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should allow a first user to redeem tokens previously supplied into the market', () => {
      return market1.supply(500, user1)
        .then(() => market1.redeem(500, user1))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should throw an error on redeem if there is not enough supplied amount from the user', async () => {
      await market1.supply(500, user1);
      return expect(market1.redeem(600, user1))
        .to
        .be
        .eventually
        .rejectedWith('There was an error redeeming your tokens');
    });
    it('should allow anyone to get the updatedSupplyOf value of any account', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(50, user2))
        .then(() => market1.payBorrow(50, user2))
        .then(() => market1.updatedSupplyOf(user1))
        .then((updatedSupply) => {
          expect(updatedSupply)
            .to
            .eq(500);
        });
    });
    it('should allow anyone to get the updatedBorrowedBy value of any account', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(50, user2))
        .then(() => market1.updatedBorrowBy(user2))
        .then((updatedBorrow) => {
          expect(updatedBorrow)
            .to
            .eq(50);
        });
    });
    it('should reject the transaction when someone try to liquidate its own debt', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(300, user2))
        .then(() => market1.borrow(150, user2))
        .then(() => controller.methods.setPrice(market2.address, 5))
        .then((setPriceSign) => Promise.all([setPriceSign, setPriceSign.estimateGas({ from: owner })]))
        .then(([setPriceSign, gas]) => setPriceSign.send({
          from: owner,
          gas,
        }))
        .then(() => expect(market1.liquidateBorrow(user2, 100, market2.address, user2)).to.be.eventually.rejected);
    });
    it('should reject the liquidation transaction when the amount is bigger than debt', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(300, user2))
        .then(() => market1.borrow(150, user2))
        .then(() => controller.methods.setPrice(market2.address, 4))
        .then((setPriceSign) => Promise.all([setPriceSign, setPriceSign.estimateGas({ from: owner })]))
        .then(([setPriceSign, gas]) => setPriceSign.send({
          from: owner,
          gas,
        }))
        .then(() => expect(market1.liquidateBorrow(user2, 151, market2.address, user1)).to.be.eventually.rejected);
    });
    it('should reject the liquidation transaction when the borrower health index is not 0', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(300, user2))
        .then(() => market1.borrow(150, user2))
        .then(() => controller.methods.setPrice(market2.address, 6))
        .then((setPriceSign) => Promise.all([setPriceSign, setPriceSign.estimateGas({ from: owner })]))
        .then(([setPriceSign, gas]) => setPriceSign.send({
          from: owner,
          gas,
        }))
        .then(() => expect(market1.liquidateBorrow(user2, 100, market2.address, user1)).to.be.eventually.rejected);
    });
    it('should allow the liquidation transaction and set the debt to the borrower', () => {
      return market1.supply(500, user1)
        .then(() => market2.supply(300, user2))
        .then(() => market1.borrow(150, user2))
        .then(() => controller.methods.setPrice(market2.address, 4))
        .then((setPriceSign) => Promise.all([setPriceSign, setPriceSign.estimateGas({ from: owner })]))
        .then(([setPriceSign, gas]) => setPriceSign.send({
          from: owner,
          gas,
        }))
        .then(() => market1.liquidateBorrow(user2, 100, market2.address, user1))
        .then((result) => {
          expect(result.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should return the earnings of an account in the market', () => {
      return market1.supply(250, user1)
        .then(() => market2.supply(250, user2))
        .then(() => market1.borrow(100, user2))
        .then(() => Promise.all([
          market1.supplyOf(user1),
          market1.updatedSupplyOf(user1),
        ]))
        .then(([supplyOf, updatedSupplyOf]) => market1
          .eventualAccountEarnings(user1))
        .then((accountEarnings) => {
          expect(accountEarnings)
            .to
            .eq(0);
        });
    });
  });
  context('Events', () => {
    let owner,
      alice,
      bob,
      charlie;
    let token2;
    let gas;
    let market2;
    beforeEach(async () => {
      [owner, alice, bob, charlie] = await web3.eth.getAccounts();

      const deployToken2 = token.deploy({
        data: FaucetTokenContract.bytecode,
        arguments: [10000, 'TOK2', 0, 'TOK2'],
      });
      const gasToken2 = await deployToken2.estimateGas({ from: owner });
      token2 = await deployToken2.send({
        from: owner,
        gas: gasToken2,
      });
      const market2Address = await Market.create(
        token2._address,
        10,
        1e6,
        20,
      );
      market2 = new Market(market2Address);

      await market2.setControllerAddress(controller._address);

      const addMarketSignature = controller.methods.addMarket(market2Address);
      const addMarketGas = await addMarketSignature.estimateGas({ from: owner });
      await addMarketSignature.send({
        from: owner,
        gas: addMarketGas,
      });
      const marketPriceSignature = controller.methods.setPrice(market2Address, 10);
      const marketPriceGas = await marketPriceSignature.estimateGas({ from: owner });
      await marketPriceSignature.send({
        from: owner,
        gas: marketPriceGas,
      });
      const allocateToSignature = token1.methods.allocateTo(alice, 1000);
      gas = await allocateToSignature.estimateGas({ from: alice });
      await allocateToSignature.send({
        from: alice,
        gas,
      });

      const allocateToSignatureCharlie = token2.methods.allocateTo(charlie, 1000);
      gas = await allocateToSignatureCharlie.estimateGas({ from: charlie });
      await allocateToSignatureCharlie.send({
        from: charlie,
        gas,
      });

      const allocateToSignatureBob = token2.methods.allocateTo(bob, 1000);
      gas = await allocateToSignatureBob.estimateGas({ from: bob });
      await allocateToSignatureBob.send({
        from: bob,
        gas,
      });

    });
    it('should get the supply event for market1 when anyone is supplying', () => {
      market1.events.supply()
        .on('data', ({ returnValues: { user, amount } }) => {
          expect(user)
            .to
            .eq(alice);
          expect(Number(amount))
            .to
            .eq(250);
        });
      const signature = token1.methods.approve(market1.address, 250);
      return signature.estimateGas({ from: alice })
        .then((gas) => signature.send({
          from: alice,
          gas,
        }))
        .then(() => market1.supply(250, alice))
        .then((tx) => {
          expect(tx.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should get the borrow event for market1 when anyone is borrowing', () => {
      market1.events.borrow()
        .on('data', ({ returnValues: { user, amount } }) => {
          expect(user)
            .to
            .eq(bob);
          expect(Number(amount))
            .to
            .eq(100);
        });
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market1.borrow(100, bob))
        .then((tx) => {
          expect(tx.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should get the pay borrow event for market1 when anyone pays a borrow', () => {
      market1.events.payBorrow()
        .on('data', ({ returnValues: { user, amount } }) => {
          expect(user)
            .to
            .eq(bob);
          expect(Number(amount))
            .to
            .eq(50);
        });
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market1.borrow(100, bob))
        .then(() => market1.payBorrow(50, bob))
        .then((tx) => {
          expect(tx.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should get the redeem event for market1 when anyone redeem tokens', () => {
      market1.events.redeem()
        .on('data', ({ returnValues: { user, amount } }) => {
          expect(user)
            .to
            .eq(alice);
          expect(Number(amount))
            .to
            .eq(50);
        });
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market1.borrow(100, bob))
        .then(() => market1.redeem(50, alice))
        .then((tx) => {
          expect(tx.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
    it('should get the past borrow event for market1 if anyone did a borrow', () => {
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market1.borrow(100, bob))
        .then(() => market1.getPastEvents('Borrow', 0))
        .then(([{ returnValues: { user } }]) => expect(user)
          .to
          .eq(bob));
    });
    it('Should return the past events filtered by an account if its needed ', () => {
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market2.supply(250, charlie))
        .then(() => market1.borrow(50, bob))
        .then(() => market1.borrow(50, bob))
        .then(() => market1.borrow(50, charlie))
        .then(() => market1.borrow(50, charlie))
        .then(() => market1.getPastEvents('Borrow', 0, { user: charlie }))
        .then((events) => events
          .forEach(({ returnValues: { user } }) => expect(user)
            .to
            .eq(charlie)));
    });
    it('Should return all past events of a given market', () => {
      market1.events.allEvents()
        .on('data', ({ returnValues: { user, amount } }) => {
          if (user === bob) {
            expect(Number(amount))
              .to
              .eq(60);
          }
          if (user === charlie) {
            expect(Number(amount))
              .to
              .eq(50);
          }
          if (user === alice) {
            expect(Number(amount))
              .to
              .eq(250);
          }
        });
      return market1.supply(250, alice)
        .then(() => market2.supply(250, bob))
        .then(() => market2.supply(250, charlie))
        .then(() => market1.borrow(60, bob))
        .then(() => market1.borrow(60, bob))
        .then(() => market1.borrow(50, charlie))
        .then(() => market1.borrow(50, charlie))
        .then((tx) => {
          expect(tx.transactionHash)
            .to
            .match(/0x[a-f0-9]{64}/);
        });
    });
  });
});
