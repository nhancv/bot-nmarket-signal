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
 * VOLUME STRATEGY
 *
 * Volume > 5 * avg( fetchingRange(10) recent volume)
 *
 */



import {IStrategy} from "./IStrategy";
import {IContainer} from "../util/Container";
import * as util from "../util/Util";
import moment from "moment";
import printLog from 'chalk-printer';
import IMarket from "../market/IMarket";

const timeZone = "+0700";
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
export class VolUp implements IStrategy {

  checking(container: IContainer): { success: boolean; message: string } {
    let total = container.getValues();
    let fractionTrigger = 5;

    if (total.length == container.getMaxSize() && total.length > 1) {
      let current = total[total.length - 1];
      if (current[current.length - 1] === true) {
        let values = total.filter((v) => v[v.length - 1] === true);
        let length = values.length;
        if (length > 1) {
          let sum = 0;
          for (let i = 0; i < length - 1; i++) {
            sum += values[i][5];
          }
          let avg = util.precisionFloorRound(sum / (length - 1), 2);
          if (current[5] > fractionTrigger * avg) {
            printLog.log("Checking: ", JSON.stringify(values));

            let change = util.precisionFloorRound(current[5]/avg, 2);
            let time = moment(current[0]).utc().utcOffset(timeZone).format("YYYY-MM-DD HH:mm");
            let message = `Change: ${change}x\nVolume: ${current[5]} (now) - ${avg} (avg)\nPrice: ${current[1]} (O) - ${current[4]} (C)\nTime:${time}`;
            return {message: message, success: true};
          }
        }

      }
    }
    return {message: "Normal case", success: false};
  }

  getFetchingRange(): number {
    return 10;
  }

  getFetchingPeriod(): string {
    return "1m";
  }

  getName(): string {
    return "VolUp";
  }


}
