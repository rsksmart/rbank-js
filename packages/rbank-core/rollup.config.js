import pkg from './package.json';
import rollupConfig from '../../rollup.config';

const controller = 'rbank-controller';

export default rollupConfig('rbank', pkg.name, {
  controller,
});
