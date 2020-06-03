import pkg from './package.json';
import rollupConfig from '../../rollup.config';

const controller = 'rbank-controller';
const market = 'rbank-market';

export default rollupConfig('rbank', pkg.name, {
  controller,
  market,
});
