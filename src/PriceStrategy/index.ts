/*
 * MIT License
 *
 * Copyright (c) 2018 Nhan Cao
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import printLog from 'chalk-printer';
import TelegrafBot from "./TelegrafBot";
import Binance from "./market/Binance";
import IMarket from "./market/IMarket";
import * as ENV from "./env";

/**
 ## Price Alert Trading Strategy
 - Alert when Volume up
 - Alert when MACD9 > 0
 */
export function execute() {
  const config = ENV.get();
  //Setup Markets
  const market: IMarket = new Binance(config);
  market.initialize().then(() => {

    //Setup Bots
    const telegrafBot = new TelegrafBot(config);
    telegrafBot.registerChannel(config.bot.channelDefault);

    //Register connection after bot initialized
    telegrafBot.setupMarket(market).then(() => {

      let symbol = market.currentSymbol().toString();

      telegrafBot.sendMessage(`Bot has been started. ${symbol.length == 0 ? '' : 'Current symbol: ' + symbol}`);
    }, error => printLog.error('Start Polling Error: ', error));

  });
}
