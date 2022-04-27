const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const Ethers = require('ethers');

dayjs.extend(utc);

const airdropAmount = 0.0005;

// get the unique key by DATE
function getLastDateKey() {
  return dayjs().utc().format('YYYYMMDD');
}

module.exports = function (app) {
  var EthereumTx = app.EthereumTx;
  var generateErrorResponse = app.generateErrorResponse;
  var config = app.config;
  var configureWeb3 = app.configureWeb3;
  var validateCaptcha = app.validateCaptcha;

  const InvalidAddressSet = new Set();

  const key = '';
  const amount = 0;

  const live = config.Ethereum.live;

  const provider = new Ethers.Wallet(
    live.privateKey,
    new Ethers.providers.JsonRpcProvider(live.rpc, {
      chainId: 321,
      name: 'KCC',
    })
  );

  app.set('InvalidAddressSet', InvalidAddressSet);

  app.set('lastDateKey', key);

  app.set('amount', amount);

  app.set('provider', provider);

  const applyKCSToday = (address) => {
    const receivedList = app.get('InvalidAddressSet');
    return receivedList.has(address);
  };

  app.post('/', function (request, response) {
    var recaptureResponse = request.body.captcha;

    // check recapture
    if (!recaptureResponse)
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: 'Invalid captcha',
      });

    // each request need to check the key,if new day is coming,reset key & amount
    const lastDateKey = app.get('lastDateKey');
    const todaysKey = getLastDateKey();

    if (lastDateKey !== todaysKey) {
      // new day
      app.set('lastDateKey', todaysKey);
      app.set('amount', 0);
    }

    // check today airdrop limit
    const amount = app.get('amount');
    if (amount >= 1) {
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: "Today's balance is depleted",
      });
    }

    var receiver = request.body.receiver;
    var tokenAddress = request.body.tokenAddress;

    // When user apply for the KCS token，check the receiver status
    if (tokenAddress === '0x0') {
      // check the receiver claim status
      if (applyKCSToday(receiver)) {
        console.log('Not eligible to receive:claimed within 30 days');
        return generateErrorResponse(response, {
          code: 500,
          title: 'Error',
          message: 'Not eligible to receive',
        });
      }
    }

    validateCaptcha(recaptureResponse, function (err, out) {
      validateCaptchaResponse(err, out, receiver, response, tokenAddress);
    });

    // validateCaptchaResponse(receiver, response, tokenAddress);
  });

  function validateCaptchaResponse(err, out, receiver, response, tokenAddress) {
    if (!out)
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: 'Invalid captcha',
      });
    if (!out.success)
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: 'Invalid captcha',
      });

    configureWeb3(config, function (err, web3) {
      configureWeb3Response(err, web3, receiver, response, tokenAddress);
    });
  }

  function configureWeb3Response(err, web3, receiver, response, tokenAddress) {
    if (err) return generateErrorResponse(response, err);

    const balance = web3.eth.getBalance(receiver).toNumber();

    if (Number(balance) >= 0.001 * 10 ** 18) {
      console.log('Not eligible to receive: kcs balance !== 0');
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: 'Not eligible to receive',
      });
    }

    if (!web3.isAddress(receiver))
      return generateErrorResponse(response, {
        code: 500,
        title: 'Error',
        message: 'invalid address',
      });

    var gasPrice = parseInt(web3.eth.gasPrice);
    var gasPriceHex = web3.toHex(gasPrice);

    provider
      .sendTransaction({
        to: receiver,
        value: web3.toHex(web3.toWei(airdropAmount)),
        gasLimit: config.Ethereum.gasLimit,
        gasPrice: gasPriceHex,
      })
      .then((tx) => {
        sendRawTransactionResponse(err, tx.hash, response);
        tx.wait(3).then(() => {
          let amount = app.get('amount');
          amount = amount + airdropAmount;
          app.set('amount', amount);

          // When receiver get the KCS token, put the address into invalidAddressSet for 20 days

          const receivedList = app.get('InvalidAddressSet');
          receivedList.add(receiver);
          setTimeout(() => {
            receivedList.delete(receiver);
            app.set('InvalidAddressSet', receivedList);
          }, 20 * 24 * 60 * 60 * 1000);
        });
      });
  }

  function sendRawTransactionResponse(err, hash, response) {
    if (err) return generateErrorResponse(response, err);

    var successResponse = {
      code: 200,
      title: 'Success',
      message: 'Tx is posted to blockchain',
      txHash: hash,
    };

    response.send({ success: successResponse });
  }
};
