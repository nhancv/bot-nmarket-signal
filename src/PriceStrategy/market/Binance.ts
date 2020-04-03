import {Container, IContainer} from "../util/Container";
import request from 'request';
import printLog from 'chalk-printer';
import {IStrategy} from "../strategy/IStrategy";
import {FireBase} from "../FireBase";
import IMarket from "./IMarket";
import * as Strategy from '../strategy';

import * as util from "../util/Util";
import moment from "moment";

const WebSocketClient = require('websocket').client;

export default class Binance implements IMarket {
  maximumConn: number;
  triggerCallback?: (dataLog) => void;
  client: any;
  tasks: object = {};
  config: any;
  marketInfo: any;
  marketSymbols?: string[];
  fetchingPeriods: string[] = ["4h"];

  constructor(config: any) {
    this.config = config;
    this.maximumConn = config.market.maximumConn;

    this.initialize = this.initialize.bind(this);
    this.notifyToBot = this.notifyToBot.bind(this);
    this.currentSymbol = this.currentSymbol.bind(this);
    this.changeSymbol = this.changeSymbol.bind(this);
    this.addSymbol = this.addSymbol.bind(this);
    this.delSymbol = this.delSymbol.bind(this);
    this.getMarketSymbols = this.getMarketSymbols.bind(this);
    this.isSymbolValid = this.isSymbolValid.bind(this);
    this.executeAfterBotInitialized = this.executeAfterBotInitialized.bind(this);
  }

  /**
   * fetchKLineVolume
   [
   [
   1499040000000,      // Open time
   "0.01634790",       // Open
   "0.80000000",       // High
   "0.01575800",       // Low
   "0.01577100",       // Close
   "148976.11427815",  // Volume
   1499644799999,      // Close time
   "2434.19055334",    // Quote asset volume
   308,                // Number of trades
   "1756.87402397",    // Taker buy base asset volume
   "28.46694368",      // Taker buy quote asset volume
   "17928899.62484339" // Ignore.
   true // is green candle, add new properties when push to container
   ]
   ]
   */
  fetchKLineVolume = (symbol: string, durTime: string, fetchingRange: number) => {
    return new Promise((resolve, reject) => {
      request(
        `https://api.binance.com/api/v1/klines?symbol=${symbol.toUpperCase()}&interval=${durTime}&limit=${fetchingRange + 2}`,
        (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            // printLog.log('Body: ' + body);
            let values = JSON.parse(body).map(v => this.normalizedData(v));
            for (let i = 1; i < values.length; i++) {
              let v = values[i];
              values[i].push(this.isGreenCandle(v[1], v[4], values[i - 1][4]))
            }
            values.splice(0, 1);
            values.splice(values.length - 1, 1);
            resolve(values);
          }
        }
      );
    });
  };

  /**
   * Green candle: open < close || (open == close && close >= prior close)
   * @param open
   * @param close
   * @param priorCLose
   */
  isGreenCandle = (open, close, priorCLose): boolean => {
    // return (open < close) || (open == close && close >= priorCLose)
    return true;//skip check green candle
  };

  /**
   * Stream data:
   {
    "e": "kline",     // Event type
    "E": 123456789,   // Event time
    "s": "BNBBTC",    // Symbol
    "k": {
        "t": 123400000, // Kline start time
        "T": 123460000, // Kline close time
        "s": "BNBBTC",  // Symbol
        "i": "1m",      // Interval
        "f": 100,       // First trade ID
        "L": 200,       // Last trade ID
        "o": "0.0010",  // Open price
        "c": "0.0020",  // Close price
        "h": "0.0025",  // High price
        "l": "0.0015",  // Low price
        "v": "1000",    // Base asset volume
        "n": 100,       // Number of trades
        "x": false,     // Is this kline closed?
        "q": "1.0000",  // Quote asset volume
        "V": "500",     // Taker buy base asset volume
        "Q": "0.500",   // Taker buy quote asset volume
        "B": "123456"   // Ignore
       }
    }
   * @param streamData
   */
  convertStreamData2Array = (streamData) => {
    return this.normalizedData([
      streamData.k.t,
      streamData.k.o,
      streamData.k.h,
      streamData.k.l,
      streamData.k.c,
      streamData.k.v,
      streamData.k.T,
      streamData.k.q,
      streamData.k.n,
      streamData.k.V,
      streamData.k.Q,
      streamData.k.B,
      false
    ])
  };

  /**
   * parse string value to float
   * @param data
   */
  normalizedData = (data: any[]) => {
    [1, 2, 3, 4, 5, 7, 9, 10, 11].forEach(i => {
      data[i] = parseFloat(data[i])
    });
    return data;
  };

  /**
   * Verify data before push to container
   * @param value
   * @param container
   */
  containerPush = (container: IContainer, value): void => {
    let last = container.last();
    if (last !== null) {
      value[value.length - 1] = this.isGreenCandle(value[1], value[4], last[4]);
    }
    container.push(value[0], value);
  };

  notifyToBot(cb: (dataLog) => void) {
    this.triggerCallback = cb;
  }

  currentSymbol(): any[] {
    return Object.keys(this.tasks);
  };

  changeSymbol(symbolFrom: string, symbolTo: string) {
    this.delSymbol(symbolFrom);
    this.addSymbol(symbolTo);
  }

  addSymbols(symbols: string[], cb: (symbol) => void) {
    const maxSession = 10;
    for (let i = 0; i < Math.min(symbols.length, maxSession); i++) {
      let sym = symbols[i];
      this.addSymbol(sym);
      cb(sym + ((i == symbols.length - 1) ? ' (END)' : ''));
    }
    symbols.splice(0, maxSession);

    if (symbols.length > 0) {
      setTimeout(() => {
        this.addSymbols(symbols, cb)
      }, 70 * 1000);
    }

  }

  addSymbol(symbol: string) {
    if (!this.tasks.hasOwnProperty(symbol) && Object.keys(this.tasks).length < this.maximumConn) {
      this.tasks[symbol] = {
        precision: 8,
        latest: {
          open: 0,
          close: 0,
          time: 0,
          period: null
        },
        signal: {
          // "1m": false
          // ...5m 15m 30m 1h 2h 4h
        }
        // "1m": this.setupPeriod(symbol, new Strategy.Signal("1m")),
        // ...5m 15m 30m 1h 2h 4h
      };

      //Generate fetching periods
      this.fetchingPeriods.forEach(p => {
        this.tasks[symbol]['signal'][p] = false;
      });
      this.fetchingPeriods.forEach(p => {
        this.tasks[symbol][p] = this.setupPeriod(symbol, new Strategy.Signal(p));
      });

      //find precision
      try {
        this.tasks[symbol].precision = 8 - util.countZeroSuffix(this.marketInfo
          ['symbols'].filter(s => s['symbol'] == symbol.toUpperCase())[0]
          ['filters'].filter(p => p['filterType'] == 'PRICE_FILTER')[0].tickSize);
      } catch (e) {
        printLog.error(e);
      }

      FireBase.notiUpdate();
    }
  }

  setupPeriod = (symbol: string, strategy: IStrategy) => {
    const fetchingRange = strategy.getFetchingRange();
    const period = strategy.getFetchingPeriod();
    const prefixTag = `${symbol.toUpperCase()}-${period.toUpperCase()}`;
    const res = {
      container: new Container(fetchingRange),
      fetchingInit: false,
      notified: false,
      streamDataTemp: <any>[] ,
      lastDataLog: null,
      client: <any>null
    };


    res.client = new WebSocketClient();

    res.client.connect(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${period}`);
    res.client.on('connectFailed', (error) => {
      printLog.error(prefixTag + ' Connect Error: ' + error.toString());
      //delete symbol
      this.delSymbol(symbol);
    });
    res.client.on('connect', (connection) => {
      res.client.connection = connection;
      printLog.ok(prefixTag + ' WebSocket Client Connected');
      this.fetchKLineVolume(symbol, period, fetchingRange).then((values) => {
        if (Array.isArray(values) && values.length) {
          values.forEach(v => {
            res.container.push(v[0], v);
          });
          //Checking for first fetching
          this.checking(res, symbol, period, strategy);
        }
        res.fetchingInit = true;
      }, (error) => {
        //delete symbol
        this.delSymbol(symbol);
      });

      connection.on('error', (error) => {
        printLog.error(prefixTag + ' Connection Error: ' + error.toString());
        //delete symbol
        this.delSymbol(symbol);
      });
      connection.on('close', () => {
        printLog.warn(prefixTag + ' Connection Closed');
        //delete symbol
        this.delSymbol(symbol);
      });
      connection.on('message', (message) => {
        if (message.type === 'utf8') {
          // printLog.log("Received: '" + message.utf8Data + "'");
          let body = JSON.parse(message.utf8Data);
          let v = this.convertStreamData2Array(body);

          //checking closed line
          // if (body.k.x) {

            if (res.fetchingInit) {
              if (res.streamDataTemp.length > 0) {
                res.streamDataTemp.forEach(s => {
                  this.containerPush(res.container, v);
                });
                res.streamDataTemp = [];
              }
              this.containerPush(res.container, v);
            } else {
              res.streamDataTemp.push(v);
            }

            //Checking in closed signal
            this.checking(res, symbol, period, strategy);
            //close signal => reset notify flag
            if (body.k.x) res.notified = false;

          // }

        }
      });
    });
    return res;
  };

  checking(res, symbol, period, strategy: IStrategy) {
    //Checking
    let status = strategy.checking(res.container, this.tasks[symbol].precision);
    //Logging
    if (status.success && this.triggerCallback) {
      printLog.log(`Checking ${symbol}-${period}-${status.success}:`, JSON.stringify(this.tasks[symbol]['signal']));
      let latestTime = status.message.time;
      if (latestTime > this.tasks[symbol]['latest'].time) {
        //update latest price
        this.tasks[symbol]['latest'] = {
          open: status.message.open,
          close: status.message.close,
          period: status.message.period.toUpperCase(),
          time: latestTime
        };
      }

      //update latest period status
      this.tasks[symbol]['signal'][period] = true;
      //Check all period status are true
      if (Object.values(this.tasks[symbol]['signal']).filter(v => v == false).length == 0) {

        //Notified
        let dataLog = `[${strategy.getName()}] Symbol: ${symbol.toUpperCase()}`;
        dataLog += `\nOpen: ${this.tasks[symbol]['latest'].open}`;
        dataLog += `\nClose: ${this.tasks[symbol]['latest'].close}`;
        dataLog += `\nTime: ${this.tasks[symbol]['latest'].period} ${moment(this.tasks[symbol]['latest'].time).utc().utcOffset("+0700").format("YYYY-MM-DD HH:mm")}`;
        if (res.lastDataLog != dataLog && !res.notified) {
          this.triggerCallback(dataLog);
          res.lastDataLog = dataLog;
          res.notified = true;
          //Show log
          printLog.ok(dataLog);
        }

        //Reset period status
        Object.keys(this.tasks[symbol]['signal']).map(v => this.tasks[symbol]['signal'][v] = false);
      }
    } else {
      //update latest period status
      this.tasks[symbol]['signal'][period] = false;
    }
  }

  delSymbol(symbol: string) {
    if (this.tasks.hasOwnProperty(symbol)) {
      this.fetchingPeriods.forEach(p => {
        let conn = this.tasks[symbol][p].client.connection;
        if (conn) {
          conn.close();
          conn.removeAllListeners();
        }
        this.tasks[symbol][p].client = null;
      });
      delete this.tasks[symbol];

      FireBase.notiUpdate();
    }
  }

  getMarketSymbols(): string[] {
    return this.marketSymbols ? this.marketSymbols : [];
  }

  isSymbolValid(symbol: string): boolean {
    return this.marketSymbols ? this.marketSymbols.indexOf(symbol) > -1 : false;
  }

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      //init firebase market flow
      FireBase.setEnv(this.config.env);
      FireBase.initMarket(this);

      request(
        `https://api.binance.com/api/v1/exchangeInfo`,
        (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            // printLog.log('Body: ' + body);
            this.marketInfo = JSON.parse(body);
            this.marketSymbols = this.marketInfo['symbols'].map(v => v['symbol'].toLowerCase());
            resolve();
          }
        }
      );

    });
  }

  executeAfterBotInitialized(): Promise<void> {


    return Promise.resolve();
  }
}
