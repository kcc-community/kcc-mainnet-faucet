/* var loader = $('.loading-container');
loader.removeClass('hidden'); */

const tokenConfig = {
  name: 'KCC mainnet Faucet Token List',
  timestamp: '2021-05-26 17:42:58',
  tokens: [
    {
      name: 'KCS Token',
      symbol: 'KCS',
      address: '0x0',
      chainId: 322,
      decimals: 18,
    },
  ],
};
const { tokens } = tokenConfig;

const generateTokenOptionList = () => {
  const select = $('#tokenList');
  const tokenListDom = tokens
    .map((token) => {
      const isETH = token.address === '0x0';
      return `<option value="${token.address}">${isETH ? 1 : 100} ${
        token.symbol
      }</option>`;
    })
    .join('');

  select.html(tokenListDom);
};

const changeInputPlaceholder = (tokenName) => {
  const prefix = 'Enter your address here to recieve ';
  const input = $('#receiver');
  input.attr('placeholder', `${prefix}${tokenName}`);
};

const changeButtonText = (tokenName) => {
  const prefix = 'REQUEST  ' + (tokenName === 'KCS' ? '1 ' : '100 ');
  const button = $('#requestTokens');
  button.text(`${prefix}${tokenName}`);
};

const tokensChange = (e) => {
  const tokenAddress = e.target.value;
  let name = '';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].address === tokenAddress) {
      name = tokens[i].symbol;
      break;
    }
  }
  changeInputPlaceholder(name);
  changeButtonText(name);
};

const initEvents = () => {
  const tokenSelect = $('#tokenList');
  tokenSelect.on('change', tokensChange);
};

window.onload = function () {
  generateTokenOptionList();
  initEvents();
};
