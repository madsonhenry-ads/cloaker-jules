const defaultHeaders = (referer) => ({
  referer,
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1'
});

module.exports = { defaultHeaders };
