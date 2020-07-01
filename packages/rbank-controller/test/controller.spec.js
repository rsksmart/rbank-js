import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import FaucetTokenContract from '../../../dependencies/DeFiProt/build/contracts/FaucetToken.json';
import MarketContract from '../../../dependencies/DeFiProt/build/contracts/Market.json';
import Controller from '../src';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Controller handler', () => {
  let controller;
  let token1, token2;
  let market1, market2;
  let owner, from;
  beforeEach(async () => {
    controller = new Controller(await Controller.create());
    const token = new web3.eth.Contract(FaucetTokenContract.abi);
    const market = new web3.eth.Contract(MarketContract.abi);
    [owner, from] = await web3.eth.getAccounts();

    const deployToken1 = token.deploy({
      data: FaucetTokenContract.bytecode,
      arguments: [10000, 'TOK1', 0, 'TOK1'],
    });
    const gasToken1 = await deployToken1.estimateGas({ from });
    token1 = await deployToken1.send({ from: owner, gas: gasToken1 });

    const deployToken2 = token.deploy({
      data: FaucetTokenContract.bytecode,
      arguments: [10000, 'TOK2', 0, 'TOK2'],
    });
    const gasToken2 = await deployToken2.estimateGas({ from });
    token2 = await deployToken2.send({ from, gas: gasToken2 });

    const deployMarket1 = await market.deploy({
      data: MarketContract.bytecode,
      arguments: [token1._address, 5e14],
    });
    const gasMarket1 = await deployMarket1.estimateGas({ from: owner });
    market1 = await deployMarket1.send({ from: owner, gas: gasMarket1 });

    const deployMarket2 = await market.deploy({
      data: MarketContract.bytecode,
      arguments: [token2._address, 5e14],
    });
    const gasMarket2 = await deployMarket2.estimateGas({ from: owner });
    market2 = await deployMarket2.send({ from: owner, gas: gasMarket2 });
  });
  context('Initialization', () => {
    it('should get an error when initializing without controller address', () => {
      expect(new Controller()).to.be.an('error');
    });
    it('should get a new instance using the controller registered address', () => {
      expect(controller).not.to.be.an('error');
    });
    it('should get the controller mantissa as number', () => {
      return controller.eventualMantissa
          .then(mantissa => {
            expect(mantissa).to.eq(1e6);
          });
    });
    it('should get zero collateral factor', () => {
      return controller.eventualCollateralFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
    it('should get zero liquidation factor', () => {
      return controller.eventualLiquidationFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
    it('should allow the controller owner to set a new collateral factor', () => {
      return controller.setCollateralFactor(1)
        .then(() => controller.eventualCollateralFactor)
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(1);
        });
    });
    it('should allow the controller owner to set a new liquidation factor', () => {
      return controller.setLiquidationFactor(0.5)
        .then(() => controller.eventualLiquidationFactor)
        .then(liquidationFactor => {
          expect(liquidationFactor).to.eq(0.5);
        });
    });
    it('should validate if the current account is the controller owner', () => {
      return controller.eventualIsOwner()
        .then((isOwner) => {
          expect(isOwner).to.be.true;
        });
    });
    it('should validate if certain account is the controller owner', () => {
      return controller.eventualIsOwner(from)
        .then((isOwner) => {
          expect(isOwner).to.be.false;
        });
    });
    it('should tell what account is the owner', () => {
      return controller.eventualOwner
        .then((registeredOwner) => {
          expect(registeredOwner).to.eq(owner);
        });
    });
  });
  context('Market management', () => {
    it('should have zero markets in the beginning', () => {
      return controller.eventualMarketListSize
        .then(marketListSize => {
          expect(marketListSize).to.eq(0);
        });
    });
    it('should validate if a market already exist with a token address', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.getEventualMarketAddressByToken(token1._address))
        .then((marketAddress) => {
          expect(marketAddress).match(/0x[A-Fa-f0-9]{40}/);
        });
    });
    it('should return an empty address if the address given it is not a token address', () => {
      return expect(controller.getEventualMarketAddressByToken(controller.address))
        .to.be.eventually.rejected;
    });
    it('should allow the controller owner to add new markets', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.addMarket(market2._address))
        .then(() => controller.eventualMarketListSize)
        .then(marketListSize => {
          expect(marketListSize).to.eq(2);
        });
    });
    it('should tell how many markets are registered', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.eventualMarketListSize)
        .then(size => {
          expect(size).to.eq(1);
        });
    });
    it('should retrieve the address of a registered market upon idx selection', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.getEventualMarketAddress(0))
        .then(marketAddress => {
          expect(marketAddress).to.eq(market1._address);
        });
    });
  });
  context('DeFi Operations', () => {
    let owner, acc1, acc2, acc3;
    beforeEach(async () => {
      [owner, acc1, acc2, acc3] = await web3.eth.getAccounts();
    });
    it('should show zero values for the account for users that have not interacted yet', () => {
      return controller.getAccountValues(acc1)
        .then(({ supplyValue, borrowValue }) => {
          expect(supplyValue).to.eq(0);
          expect(borrowValue).to.eq(0);
        });
    });
    it('should show updated values for users who have borrowed and supplied', () => {
      return controller.addMarket(market1._address)
        .then(() => {
          const signature = market1.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: owner, gas }))
        .then(() => {
          const signature = token1.methods.allocateTo(acc1, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => {
          const signature = token1.methods.approve(market1._address, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => {
          const signature = market1.methods.supply(500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => controller.setMarketPrice(market1._address, 10))
        .then(() => controller.eventualMarketPrice(market1._address))
        .then(marketPrice => {
          expect(marketPrice).to.eq(10);
          return true;
        })
        .then(() => controller.addMarket(market2._address))
        .then(() => {
          const signature = market2.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: owner, gas }))
        .then(() => {
          const signature = token2.methods.allocateTo(acc2, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => {
          const signature = token2.methods.approve(market2._address, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => {
          const signature = market2.methods.supply(1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => controller.setMarketPrice(market2._address, 10))
        .then(() => controller.eventualMarketPrice(market2._address))
        .then(marketPrice => {
          expect(marketPrice).to.eq(10);
          return true;
        })
        .then(() => {
          const signature = market2.methods.borrow(20);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => controller.getAccountValues(acc1))
        .then(({ supplyValue, borrowValue }) => {
          expect(supplyValue).to.eq(5000);
          expect(borrowValue).to.eq(200);
        });
    });
    it('should calculate the liquidity for a given account', () => {
      return controller.setCollateralFactor(1)
        .then(() => controller.addMarket(market1._address))
        .then(() => {
          const signature = market1.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: owner, gas }))
        .then(() => {
          const signature = token1.methods.allocateTo(acc1, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => {
          const signature = token1.methods.approve(market1._address, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => {
          const signature = market1.methods.supply(500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => controller.setMarketPrice(market1._address, 10))
        .then(() => controller.eventualMarketPrice(market1._address))
        .then(marketPrice => {
          expect(marketPrice).to.eq(10);
          return true;
        })
        .then(() => controller.addMarket(market2._address))
        .then(() => {
          const signature = market2.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: owner, gas }))
        .then(() => {
          const signature = token2.methods.allocateTo(acc2, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => {
          const signature = token2.methods.approve(market2._address, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => {
          const signature = market2.methods.supply(1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc2, gas }))
        .then(() => controller.setMarketPrice(market2._address, 10))
        .then(() => controller.eventualMarketPrice(market2._address))
        .then(marketPrice => {
          expect(marketPrice).to.eq(10);
          return true;
        })
        .then(() => {
          const signature = market2.methods.borrow(100);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({ from: acc1, gas }))
        .then(() => controller.getAccountLiquidity(acc1))
        .then(liquidity => Number(liquidity))
        .then(liquidity => {
          expect(liquidity).to.eq(3000);
        });
    });
  });
});
