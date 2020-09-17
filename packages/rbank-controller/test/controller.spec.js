import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import FaucetTokenContract from '../../../dependencies/DeFiProt/build/contracts/FaucetToken.json';
import MarketContract from '../../../dependencies/DeFiProt/build/contracts/Market.json';
import ControllerContract from '../../../dependencies/DeFiProt/build/contracts/Controller.json';
import Controller from '../src';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Controller handler', () => {
  let controller;
  let token1,
    token2;
  let market1,
    market2;
  let owner,
    from;
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
    token1 = await deployToken1.send({
      from: owner,
      gas: gasToken1,
    });

    const deployToken2 = token.deploy({
      data: FaucetTokenContract.bytecode,
      arguments: [10000, 'TOK2', 0, 'TOK2'],
    });
    const gasToken2 = await deployToken2.estimateGas({ from });
    token2 = await deployToken2.send({
      from,
      gas: gasToken2,
    });

    const deployMarket1 = await market.deploy({
      data: MarketContract.bytecode,
      arguments: [token1._address, 2, 1e6, 20],
    });
    const gasMarket1 = await deployMarket1.estimateGas({ from: owner });
    market1 = await deployMarket1.send({
      from: owner,
      gas: gasMarket1,
    });

    const deployMarket2 = await market.deploy({
      data: MarketContract.bytecode,
      arguments: [token2._address, 2, 1e6, 20],
    });
    const gasMarket2 = await deployMarket2.estimateGas({ from: owner });
    market2 = await deployMarket2.send({
      from: owner,
      gas: gasMarket2,
    });
  });
  context('Initialization', () => {
    it('should get an error when initializing without controller address', () => {
      expect(new Controller())
        .to
        .be
        .an('error');
    });
    it('should create and return the address of the controller lower cased', () => {
      return Controller.create()
        .then((controllerAddress) => {
          expect(controllerAddress)
            .to
            .match(/0x[a-f0-9]{40}/);
        });
    });
    it('should return the creation blockNumber of the controller instance',() => {
      let currentBlock;
      return web3.eth.getBlockNumber()
          .then((block) => {
            currentBlock = Number(block);
            return Controller.create();
          })
          .then((controllerAddress) => {
            console.log(currentBlock);
            const controller = new Controller(controllerAddress);
            return controller.eventualDeployBlock;
          })
          .then((deployBlock) => expect(deployBlock).to.eq(currentBlock+1))
    });
    it('should get the address of the controller created statically in lower case', () => {
      return expect(controller.address)
        .to
        .match(/0x[a-f0-9]{40}/);
    });
    it('should gt the address of a controller created directly in lower case', () => {
      const ControllerSC = new web3.eth.Contract(ControllerContract.abi);
      const deployControllerSC = ControllerSC.deploy({ data: ControllerContract.bytecode });
      return deployControllerSC.estimateGas({ from: owner })
        .then((gas) => deployControllerSC.send({
          from: owner,
          gas,
        }))
        .then((instance) => instance._address)
        .then((controllerDeployedAddress) => [controllerDeployedAddress, new Controller(controllerDeployedAddress)])
        .then(([cAddress, cInstance]) => {
          expect(cInstance.address)
            .to
            .eq(cAddress.toLowerCase());
        });
    });
    it('should get a new instance using the controller registered address', () => {
      expect(controller)
        .not
        .to
        .be
        .an('error');
    });
    it('should get the controller mantissa as number', () => {
      return controller.eventualMantissa
        .then(mantissa => {
          expect(mantissa)
            .to
            .eq(1e6);
        });
    });
    it('should get zero collateral factor', () => {
      return controller.eventualCollateralFactor
        .then(collateralFactor => {
          expect(collateralFactor)
            .to
            .eq(0);
        });
    });
    it('should get zero liquidation factor', () => {
      return controller.eventualLiquidationFactor
        .then(collateralFactor => {
          expect(collateralFactor)
            .to
            .eq(0);
        });
    });
    it('should allow the controller owner to set a new collateral factor', () => {
      return controller.setCollateralFactor(1)
        .then(() => controller.eventualCollateralFactor)
        .then(collateralFactor => {
          expect(collateralFactor)
            .to
            .eq(1);
        });
    });
    it('should allow the controller owner to set a new liquidation factor', () => {
      return controller.setLiquidationFactor(0.5)
        .then(() => controller.eventualLiquidationFactor)
        .then(liquidationFactor => {
          expect(liquidationFactor)
            .to
            .eq(0.5);
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
          expect(registeredOwner)
            .to
            .eq(owner);
        });
    });
  });
  context('Market management', () => {
    it('should have zero markets in the beginning', () => {
      return controller.eventualMarketListSize
        .then(marketListSize => {
          expect(marketListSize)
            .to
            .eq(0);
        });
    });
    it('should validate if a market already exist with a token address', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.getEventualMarketAddressByToken(token1._address))
        .then((marketAddress) => {
          expect(marketAddress)
            .to
            .eq(market1._address);
        });
    });
    it(`should return an error if the address given isn't a token address`, () => {
      return expect(controller.getEventualMarketAddressByToken(controller.address))
        .to
        .be
        .eventually
        .rejectedWith('Token address not registered');
    });
    it('should allow the controller owner to add new markets', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.addMarket(market2._address))
        .then(() => controller.eventualMarketListSize)
        .then(marketListSize => {
          expect(marketListSize)
            .to
            .eq(2);
        });
    });
    it('should tell how many markets are registered', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.eventualMarketListSize)
        .then(size => {
          expect(size)
            .to
            .eq(1);
        });
    });
    it('should retrieve the address of a registered market upon idx selection', () => {
      return controller.addMarket(market1._address)
        .then(() => controller.getEventualMarketAddress(0))
        .then(marketAddress => {
          expect(marketAddress)
            .to
            .eq(market1._address);
        });
    });
  });
  context('DeFi Operations', () => {
    let owner,
      acc1,
      acc2,
      acc3;
    beforeEach(async () => {
      [owner, acc1, acc2, acc3] = await web3.eth.getAccounts();
      await controller.setCollateralFactor(1);
      await controller.setLiquidationFactor(0.5);
    });
    it('should show zero values for the account for users that have not interacted yet', () => {
      return controller.getAccountValues(acc1)
        .then(({ supplyValue, borrowValue }) => {
          expect(supplyValue)
            .to
            .eq(0);
          expect(borrowValue)
            .to
            .eq(0);
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
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.allocateTo(acc1, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.approve(market1._address, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = market1.methods.supply(500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.setMarketPrice(market1._address, 10))
        .then(() => controller.eventualMarketPrice(market1._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => controller.addMarket(market2._address))
        .then(() => {
          const signature = market2.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.allocateTo(acc2, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.approve(market2._address, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = market2.methods.supply(1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => controller.setMarketPrice(market2._address, 10))
        .then(() => controller.eventualMarketPrice(market2._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => {
          const signature = market2.methods.borrow(20);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.getAccountValues(acc1))
        .then(({ supplyValue, borrowValue }) => {
          expect(supplyValue)
            .to
            .eq(5000);
          expect(borrowValue)
            .to
            .eq(200);
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
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.allocateTo(acc1, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.approve(market1._address, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = market1.methods.supply(500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.setMarketPrice(market1._address, 10))
        .then(() => controller.eventualMarketPrice(market1._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => controller.addMarket(market2._address))
        .then(() => {
          const signature = market2.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.allocateTo(acc2, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.approve(market2._address, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = market2.methods.supply(1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => controller.setMarketPrice(market2._address, 10))
        .then(() => controller.eventualMarketPrice(market2._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => {
          const signature = market2.methods.borrow(100);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.getAccountLiquidity(acc1))
        .then(liquidity => Number(liquidity))
        .then(liquidity => {
          expect(liquidity)
            .to
            .eq(3000);
        });
    });
    it('should return 1 as health factor for users accounts that have not interacted yet', () => {
      return controller.getAccountHealth(acc1)
        .then((healthFactor) => {
          expect(healthFactor)
            .to
            .eq(1);
        });
    });
    it('should return the health factor of a given account', () => {
      return controller.addMarket(market1._address)
        .then(() => {
          const signature = market1.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.allocateTo(acc1, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = token1.methods.approve(market1._address, 500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => {
          const signature = market1.methods.supply(500);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.setMarketPrice(market1._address, 10))
        .then(() => controller.eventualMarketPrice(market1._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => controller.addMarket(market2._address))
        .then(() => {
          const signature = market2.methods.setController(controller.address);
          const eventualEstimatedGas = signature.estimateGas({ from: owner });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: owner,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.allocateTo(acc2, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = token2.methods.approve(market2._address, 1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => {
          const signature = market2.methods.supply(1000);
          const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc2,
          gas,
        }))
        .then(() => controller.setMarketPrice(market2._address, 10))
        .then(() => controller.eventualMarketPrice(market2._address))
        .then(marketPrice => {
          expect(marketPrice)
            .to
            .eq(10);
          return true;
        })
        .then(() => {
          const signature = market2.methods.borrow(100);
          const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
          return [signature, eventualEstimatedGas];
        })
        .then(result => Promise.all(result))
        .then(([signature, gas]) => signature.send({
          from: acc1,
          gas,
        }))
        .then(() => controller.getAccountHealth(acc1))
        .then((healthFactor) => {
          expect(healthFactor)
            .to
            .eq(0.871926);
        });
    });
    it('should return the health as 0 when somebody has bad health', () => {
      return controller.addMarket(market1._address)
          .then(() => {
            const signature = market1.methods.setController(controller.address);
            const eventualEstimatedGas = signature.estimateGas({ from: owner });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: owner,
            gas,
          }))
          .then(() => {
            const signature = token1.methods.allocateTo(acc1, 500);
            const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc1,
            gas,
          }))
          .then(() => {
            const signature = token1.methods.approve(market1._address, 500);
            const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc1,
            gas,
          }))
          .then(() => {
            const signature = market1.methods.supply(500);
            const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc1,
            gas,
          }))
          .then(() => controller.setMarketPrice(market1._address, 10))
          .then(() => controller.addMarket(market2._address))
          .then(() => {
            const signature = market2.methods.setController(controller.address);
            const eventualEstimatedGas = signature.estimateGas({ from: owner });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: owner,
            gas,
          }))
          .then(() => {
            const signature = token2.methods.allocateTo(acc2, 1000);
            const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc2,
            gas,
          }))
          .then(() => {
            const signature = token2.methods.approve(market2._address, 1000);
            const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc2,
            gas,
          }))
          .then(() => {
            const signature = market2.methods.supply(1000);
            const eventualEstimatedGas = signature.estimateGas({ from: acc2 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc2,
            gas,
          }))
          .then(() => controller.setMarketPrice(market2._address, 10))
          .then(() => controller.eventualMarketPrice(market2._address))
          .then(marketPrice => {
            expect(marketPrice)
                .to
                .eq(10);
            return true;
          })
          .then(() => {
            const signature = market2.methods.borrow(250);
            const eventualEstimatedGas = signature.estimateGas({ from: acc1 });
            return [signature, eventualEstimatedGas];
          })
          .then(result => Promise.all(result))
          .then(([signature, gas]) => signature.send({
            from: acc1,
            gas,
          }))
          .then(() => controller.setMarketPrice(market1._address, 7))
          .then(() => controller.getAccountHealth(acc1))
          .then((healthFactor) => {
            expect(healthFactor)
                .to
                .eq(0);
          });
    })
  });
  context('Account information', () => {
    it('should return the creation blockNumber of the controller',() => {
      return Promise.all([controller.eventualDeployBlock, controller.address])
          .then(([block, controllerAddress]) => {
            let controllerGenesis = new web3.eth.Contract(ControllerContract.abi, controllerAddress);
            controllerGenesis.defaultBlock = block;
            return controllerGenesis.methods.getAccountValues(from).call();
          })
          .then(({supplyValue, borrowValue}) => {
            expect(Number(supplyValue)).to.eq(0);
            expect(Number(borrowValue)).to.eq(0);
          })
    });
    it('should return an array of objects with the defined data for a day period', async () => {
      const newController = new Controller(await Controller.create());
      const market = new web3.eth.Contract(MarketContract.abi);
      const deployMarket = await market.deploy({
        data: MarketContract.bytecode,
        arguments: [token1._address, 2, 1e6, 20],
      });
      let market1;
      let supplySignArr = [];
      let approveSign;
      return deployMarket.estimateGas({from: owner})
          .then((gas) => deployMarket.send({from: owner, gas}))
          .then((market) => {
            market1 = market;
            return newController.addMarket(market._address);
          })
          .then(() => market1.methods.setController(newController.address))
          .then(() => newController.setMarketPrice(market1._address, 10))
          .then(() => token1.methods.allocateTo(from, 1000000).send({from}))
          .then(() => {
            approveSign = token1.methods.approve(market1._address, 1000000);
            return approveSign.estimateGas({from});
          })
          .then((gas) => approveSign.send({from, gas}))
          .then(() => {
            let supplySign;
            const estimateGasPromises = [];
            for (let i = 0; i < 25; i++) {
              const randomInt = Math.floor(Math.random() * (41601 - 10)) + 10;
              supplySign = market1.methods.supply(randomInt);
              supplySignArr.push(supplySign);
              estimateGasPromises.push(supplySign.estimateGas({from}));
            }
            return Promise.all(estimateGasPromises);
          })
          .then((estimatedGas) => Promise.all(supplySignArr
              .map((supplySign, idx) => supplySign
                  .send({from, gas: estimatedGas[idx]}))))
          .then(() => newController.getOverallBalance(from, 'day'))
          .then((overallBalance) => {
            expect(overallBalance.length).to.eq(12);
            overallBalance.forEach(([timestamp, balance]) => {
              expect(typeof timestamp).to.eq('object');
              expect(typeof balance).to.eq('number')
            })
          })
    });
  });
});
