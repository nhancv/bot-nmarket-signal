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

import Telegraf from 'telegraf'
import printLog from 'chalk-printer';
import IMarket from "./market/IMarket";
import {MarketTrades} from "./util/MarketTrades";
import * as fs from "fs";
import {FireBase} from "./FireBase";

const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');

const COMMAND = {
  REGISTERCHANNEL: 'registerChannel',
  REMOVECHANNEL: 'removeChannel',
  GETSYMBOL: 'getSymbol',
  MYID: 'myId',
  CHANGESYMBOL: 'changeSymbol',
  ADDSYMBOL: 'addSymbol',
  DELSYMBOL: 'delSymbol',
  EXPORTTRADE: 'exportTrade',
  SYMBOLCANCEL: 'symbolCancel',
  GETSYMBOLBTC: 'getSymbolBTC'
};
/**
 registerChannel - Register channel by id
 removeChannel - Remove channel by id
 changeSymbol
 addSymbol
 delSymbol
 getSymbol
 myId
 */
export default class TelegrafBot {

  channels: number[] = [];
  bot: any;
  command: any = null;
  config: any;

  constructor(config: any) {
    this.config = config;
    this.bot = new Telegraf(config.bot.token);
    this.bot.telegram.getMe().then((botInfo) => {
      this.bot.options.username = botInfo.username
    });
    //middleware
    this.bot.use((ctx, next) => {
      if (ctx.updateType == 'callback_query' ||
        (ctx.updateType == 'message' && (this.isAdmin(ctx.message.from.id) || ctx.message.text === '/myId'))) {
        return next(ctx);
      }

      ctx.reply('You are not admin');
    });
    this.bot.start((ctx) => ctx.reply('Welcome'));
    this.bot.help((ctx) => {
      ctx.reply(
        '/changeSymbol - Change symbol\n' +
        '/addSymbol - Add symbol\n' +
        '/delSymbol - Delete symbol\n' +
        '/getSymbol - Get current symbol\n' +
        '/getSymbolBTC - Get btc symbols\n' +
        '/exportTrade - Export market trade data today\n' +
        '/myId - Get my id\n'
      )
    });
    //Register channel by id
    this.bot.command(COMMAND.REGISTERCHANNEL, (ctx) => {
      let channelId = ctx.message.chat.id;
      let message = "Channel";
      if (this.registerChannel(channelId)) {
        message += ` ${channelId} has been registered successfully`;
      } else {
        message += ` ${channelId} already registered`;
      }
      ctx.reply(message);
    });
    //Remove channel by id
    this.bot.command(COMMAND.REMOVECHANNEL, (ctx) => {
      let channelId = ctx.message.chat.id;
      let message = "Channel";
      if (this.removeChannel(channelId)) {
        message += ` ${channelId} has been removed successfully`;
      } else {
        message += ` ${channelId} already removed`;
      }
      ctx.reply(message);
    });
  }

  // Setup market should be called after bot initialized
  setupMarket = (market: IMarket): Promise<void> => {
    //Get current symbol
    this.bot.command(COMMAND.GETSYMBOL, (ctx) => {
      let curSyms = market.currentSymbol();
      if (curSyms.length == 0) {
        ctx.reply(`Symbol empty`);
      } else {
        ctx.reply(`Current symbol: ${curSyms.toString()}`);
      }
    });
    //Get BTC pairs
    this.bot.command(COMMAND.GETSYMBOLBTC, (ctx) => {
      let btcPair = market.getMarketSymbols().filter(s => s.match(/^([a-zA-Z]+btc)/));
      if (btcPair.length == 0) {
        ctx.reply(`Symbol empty`);
      } else {
        ctx.reply(btcPair.toString());
      }
    });
    //Get from user id
    this.bot.command(COMMAND.MYID, (ctx) => {
      let fromId = ctx.message.from.id;
      ctx.reply(`Your id is: ${fromId}`);
    });
    //Change symbol
    const symbolCancel = Extra
      .HTML()
      .markup((m) => m.inlineKeyboard([
        m.callbackButton('Cancel request', 'symbolCancel')
      ]).resize());
    this.bot.command(COMMAND.CHANGESYMBOL, (ctx) => {
      this.command = COMMAND.CHANGESYMBOL;
      ctx.reply('Type follow format: "currentsymbol newsymbol"\nEx: tusdbtc aionbtc\nType "cancel" to skip', symbolCancel);
    });
    this.bot.command(COMMAND.ADDSYMBOL, (ctx) => {
      this.command = COMMAND.ADDSYMBOL;
      ctx.reply('Type symbol name to add \nEx: tusdbtc or tusdbtc,aionbtc\nType "cancel" to skip', symbolCancel);
    });
    this.bot.command(COMMAND.DELSYMBOL, (ctx) => {
      this.command = COMMAND.DELSYMBOL;
      ctx.reply('Type symbol name to delete\nEx: tusdbtc or tusdbtc,aionbtc\nType "cancel" to skip', symbolCancel);
    });
    this.bot.command(COMMAND.EXPORTTRADE, (ctx) => {
      this.command = COMMAND.EXPORTTRADE;
      ctx.reply('Type symbol name to export market trade data in today\nEx: aionbtc\nType "cancel" to skip', symbolCancel);
    });
    this.bot.action(COMMAND.SYMBOLCANCEL, (ctx) => {
      if (this.command !== null) {
        this.command = null;
        ctx.answerCbQuery('Cancel request accepted!');
      } else {
        ctx.answerCbQuery('Cancel request already accepted!');
      }
    });

    this.bot.on('text', (ctx) => {
      if (this.command === COMMAND.CHANGESYMBOL) {
        let text = ctx.message.text.toLowerCase();
        if (text == 'cancel') {
          ctx.reply('Cancel request accepted!');
        } else {
          let arr = text.split(" ");
          if (arr.length == 2 && market.isSymbolValid(arr[0]) && market.isSymbolValid(arr[1])) {
            market.changeSymbol(arr[0], arr[1]);
            ctx.reply('Symbol changed');
          } else {
            ctx.reply('Symbol is invalid');
          }
        }
      } else if (this.command === COMMAND.ADDSYMBOL) {
        let text = ctx.message.text.toLowerCase();
        if (text == 'cancel') {
          ctx.reply('Cancel request accepted!');
        } else {
          let arr = text.split(/\s*,\s*/).filter((s) => market.isSymbolValid(s));
          arr = arr.filter((s, pos) => arr.indexOf(s) == pos);

          if (arr.length == 0) {
            ctx.reply('Symbol is invalid');
          } else {
            market.addSymbols(arr, (s) => {
              ctx.reply(`Symbol ${s} added`);
            });
          }
        }
      } else if (this.command === COMMAND.DELSYMBOL) {
        let text = ctx.message.text.toLowerCase();
        if (text == 'cancel') {
          ctx.reply('Cancel request accepted!');
        } else {
          let arr = text.split(/\s*,\s*/).filter((s) => market.isSymbolValid(s));
          arr = arr.filter((s, pos) => arr.indexOf(s) == pos);

          if (arr.length == 0) {
            ctx.reply('Symbol is invalid');
          } else {
            arr.forEach((s) => {
              market.delSymbol(s);
              ctx.reply(`Symbol ${s} deleted`);
            });
          }
        }
      } else if (this.command === COMMAND.EXPORTTRADE) {
        let text = ctx.message.text.toLowerCase();
        if (text == 'cancel') {
          ctx.reply('Cancel request accepted!');
        } else {
          if (market.isSymbolValid(text)) {
            let sb = text.toUpperCase();
            const marketTrades = new MarketTrades();
            marketTrades.fetchMarketTradeToday(sb, [])
              .then(totalv => {
                printLog.log(`[${sb}] Market trade today: ${totalv.length}`);
                marketTrades.excelGenerateFile(sb, totalv).then((succ: any) => {
                  this.sendDocument({
                    source: fs.readFileSync(`./${succ.file}`),
                    filename: succ.file
                  });
                }, (err) => printLog.error(err));
              }, e => printLog.error(e));
            ctx.reply('Exporting... Please wait...');
          } else {
            ctx.reply('Symbol is invalid');
          }
        }
      }
      this.command = null;
    });

    market.notifyToBot((dataLog) => {
      this.sendMessage(dataLog);
    });

    return new Promise((resolve, reject) => {
      this.bot.startPolling();
      // Get symbols from firebase storage
      FireBase.getSymbols().then(fireData => {
        let defaultSymbol: any[] = [];
        if (fireData) {
          defaultSymbol = fireData.split(/\s*,\s*/)
            .filter((s) => market.isSymbolValid(s));
        } else {
          defaultSymbol = this.config.market.symbol.split(/\s*,\s*/)
            .filter((s) => market.isSymbolValid(s));
        }
        if (defaultSymbol.length > 0) {
          defaultSymbol = defaultSymbol.filter((s, pos) => defaultSymbol.indexOf(s) == pos);

          market.addSymbols(defaultSymbol, (s) => {
            this.sendMessage(`Symbol ${s} added`);
          });
          printLog.log('Default symbols: ' + defaultSymbol.toString());
        } else {
          printLog.log('Symbol empty');
        }
        resolve();
      }, reject);
    });
  };

  removeChannel = (channelId: number) => {
    let index = this.channels.indexOf(channelId);
    if (index > -1) {
      this.channels.splice(index, 1);
      return true;
    }
    return false;
  };

  registerChannel = (channelId: number) => {
    if (this.channels.indexOf(channelId) == -1) {
      this.channels.push(channelId);
      return true;
    }
    return false;
  };

  sendMessage = (message: string) => {
    this.channels.forEach(c => {
      this.bot.telegram.sendMessage(c, message).catch(error => {
        printLog.error(error);
      })
    });
  };

  sendDocument = (document: any) => {
    this.channels.forEach(c => {
      this.bot.telegram.sendDocument(c, document).then(() => {
        try {
          fs.unlinkSync(`./${document.filename}`);
        } catch (e) {
          printLog.error('Delete file error');
        }
      }).catch(function (error) {
        printLog.error(error);
      })
    });
  };

  isAdmin = (id: number): boolean => {
    return this.config.bot.admin.indexOf(id) > -1;
  }
}
