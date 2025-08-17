module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: [],
  };
};
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          targets: { node: 'current' },
        },
      ],
      require.resolve('@babel/preset-react'),
      require.resolve('@babel/preset-typescript'),
    ],
  };
};
