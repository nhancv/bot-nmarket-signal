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


/**
 * SIGNAL STRATEGY
 *
 (macd 9 >= 0)

 EMA_PERIOD  14.00
 MACD_Fast  12.00
 MACD_Slow  26.00
 MACD_Signal  9.00

 FIND EMA(14):

 EMA0 = CLOSE0
 EMA1 = CLOSE1 * 2/(1+EMA_PERIOD) + EMA0*(1-2/(1+EMA_PERIOD))
 EMAi = CLOSEi * 2/(1+EMA_PERIOD) + EMA[i-1] * (1-2/(1+EMA_PERIOD)), (i>0)
 ** Become correct after 2 x EMA PERIOD

 FIND MACD(12):
 MACD0 = CLOSE0
 MACD1 = CLOSE1 * 2/(1+MACD_Fast) + MACD0*(1-2/(1+MACD_Fast))
 MACDi = CLOSEi * 2/(1+MACD_Fast) + MACD[i-1] * (1-2/(1+MACD_Fast)), (i>0)

 FIND MACD(26):
 MACD0 = CLOSE0
 MACD1 = CLOSE1 * 2/(1+MACD_Slow) + MACD0 * (1-2/(1+MACD_Slow))
 MACDi = CLOSEi * 2/(1+MACD_Slow) + MACD[i-1] * (1-2/(1+MACD_Slow)), (i>0)

 FIND MACDX:
 MACDX = MACD(12) - MACD(26)

 FIND MACD SIGNAL = MACD(9):
 MACD0 = MACDX0
 MACD1 = MACDX1*2/(1+MACD_Signal) + MACDX0*(1-2/(1+MACD_Signal))
 MACDi = MACDXi * 2/(1+MACD_Signal) + MACDX[i-1] * (1-2/(1+MACD_Signal)), (i>0)
 *
 */


import {IStrategy} from "./IStrategy";
import {IContainer} from "../util/Container";
import * as util from "../util/Util";
import moment from "moment";
import printLog from 'chalk-printer';

/*
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
   true //boolean for Green candle
   ]
 */
export class Signal implements IStrategy {

  private period: string;

  constructor(period = "5m") {
    this.period = period;
  }

  checking(container: IContainer, precision: number): { success: boolean; message: any } {
    const EMA7 = 7.0;
    const EMA25 = 25.0;
    const MACD12 = 12.0;
    const MACD26 = 26.0;
    const MACD9 = 9.0;

    let total = container.getValues();

    if (total.length == container.getMaxSize() && total.length > 1) {

      //find EMA7
      // this.calculateIndicator('EMA7', total, EMA7);
      //find EMA9
      // this.calculateIndicator('EMA25', total, EMA25);
      //find MACD12
      this.calculateIndicator('MACD12', total, MACD12);
      //find MACD26
      this.calculateIndicator('MACD26', total, MACD26);
      //find MACDX
      this.calculateMACDX('MACDX', total, 'MACD12', 'MACD26');
      //find MACD9
      this.calculateIndicator('MACD9', total, MACD9, 'MACDX');

      //Format with formula
      this.formatFormula(total, precision);
      let current = total[total.length - 1];
      if (current['MACD']['9'] >= 0) {
        return {
          message: {
            period: this.getFetchingPeriod().toUpperCase(),
            open: current[1].toFixed(precision),
            close: current[4].toFixed(precision),
            time: current[0]
          }, success: true
        };
      }
    }
    return {message: "Normal case", success: false};
  }

  getFetchingRange(): number {
    return 500; //for Binance range
  }

  getFetchingPeriod(): string {
    return this.period;
  }

  /**
   * Find indicator value (EMA, MACD, SIGNAL)
   INDICATOR[0] = Data[0][refKey]
   INDICATOR[1] = Data[1][refKey] * 2/(1+period) + INDICATOR[0] * (1-2/(1+period))
   INDICATOR[i] = Data[i][refKey] * 2/(1+period) + INDICATOR[i-1] * (1-2/(1+period)), (i>0)
   * @param key
   * @param data
   * @param period
   * @param refKey refKey = 4 => Data[][4] = price closed, otherwise Data[][refKey] = reference value
   */
  calculateIndicator(key: string, data: any[], period: number, refKey: any = 4): any {
    let i = 0;
    if (i == 0 && !data[i].hasOwnProperty(key)) {
      data[i][key] = data[i][refKey];
    }

    for (i = 1; i < data.length; i++) {
      if (!data[i].hasOwnProperty(key)) {
        data[i][key] = data[i][refKey] * 2 / (1 + period) + data[i - 1][key] * (1 - 2 / (1 + period));
      }
    }
  }

  /**
   * MACDX = MACD(12) - MACD(26)
   * @param key
   * @param macd12Key
   * @param macd26Key
   * @param data
   */
  calculateMACDX(key: string, data: any[], macd12Key: string, macd26Key: string): any {
    for (let i = 0; i < data.length; i++) {
      if (!data[i].hasOwnProperty(key)) {
        data[i][key] = data[i][macd12Key] - data[i][macd26Key];
      }
    }
  }

  /**
   ON BINANCE IOS
   macd(12,26,9), x, y, z ~ MACDX, MACD9, MACDX-MACD9

   FORMULA: (macd 12 >= 0 || macd 9 == 0) WITH X=MACD12, Z=MACD9
   * @param data
   * @param precision
   */
  formatFormula(data: any[], precision: number) {
    for (let i = 0; i < data.length; i++) {
      // data[i]['EMA'] = {
      //   '7': data[i]['EMA7'],
      //   '7Dis': util.precisionRound(data[i]['EMA7'], precision),
      //   '25': data[i]['EMA25'],
      //   '25Dis': util.precisionRound(data[i]['EMA25'], precision),
      // };
      data[i]['MACD'] = {
        '12': data[i]['MACDX'],
        '12Dis': util.precisionRound(data[i]['MACDX'], precision),
        '26': data[i]['MACD9'],
        '26Dis': util.precisionRound(data[i]['MACD9'], precision),
        '9': data[i]['MACDX'] - data[i]['MACD9'],
        '9Dis': util.precisionRound(data[i]['MACDX'] - data[i]['MACD9'], precision)
      };
      // delete data[i]['EMA7'];
      // delete data[i]['EMA25'];
      delete data[i]['MACDX'];
      delete data[i]['MACD9'];
      delete data[i]['MACD12'];
      delete data[i]['MACD26'];
    }
  }

  /**
   * Input: -0.0000011 => -
   * @param num
   * @param rounded
   * @param precision
   */
  formatDisplay(num: number, rounded: number, precision: number): string {
    return (rounded == 0 && num < 0) ? `-${rounded.toFixed(precision)}` : rounded.toFixed(precision);
  }

  getName(): string {
    return "Signal";
  }

}
