module.exports = {
  '/api': {
    target: process.env['services__gateway__https__0'] 
            || process.env['services__gateway__http__0']
            || 'http://localhost:5000',
    pathRewrite: { '^/api': '' },
    secure: false,
    changeOrigin: true
  }
};
