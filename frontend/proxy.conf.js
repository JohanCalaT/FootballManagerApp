// Dev proxy for Ionic/Angular.
//
// Aspire AppHost injects the gateway URL into this npm app via
// `services__gateway__http__0` / `services__gateway__https__0`
// (see src/FootballManagerApp/FootballManagerApp.AppHost/AppHost.cs).
//
// The frontend always uses RELATIVE paths (`/api/...`); this proxy
// forwards them to the gateway WITHOUT rewriting — YARP routes are
// defined with the `/api` prefix and expect it intact.
module.exports = {
  '/api': {
    target:
      process.env['services__gateway__https__0'] ||
      process.env['services__gateway__http__0'] ||
      'http://localhost:5000',
    secure: false,
    changeOrigin: true,
  },
};
