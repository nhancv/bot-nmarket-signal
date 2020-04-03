import request from 'request';
import printLog from 'chalk-printer';
import moment from "moment";
import TelegrafBot from "../TelegrafBot";


export class MarketTrades {

  timeZone: string;

  constructor(timeZone: string = "+0700") {
    this.timeZone = timeZone;
  }

  /**
   * Input data
   [
   {
    "id": 28457,
    "price": "4.00000100",
    "qty": "12.00000000",
    "time": 1499865549590,
    "isBuyerMaker": true, //False: Green, True: Red
    "isBestMatch": true
  }
   ]
   * @param symbol
   * @param totalv
   */
  excelGenerateFile(symbol: string, totalv: any[]) {
    return new Promise((resolve: any, reject) => {
      let xl = require('excel4node');
      let wb = new xl.Workbook({defaultFont: {size: 12, name: 'Calibri'}});
      let ws = wb.addWorksheet('Sheet 1');
      let styleGreen = wb.createStyle({font: {color: '#71A61E'}});
      let styleRed = wb.createStyle({font: {color: '#E71271'}});

      ws.column(1).setWidth(7);
      ws.column(2).setWidth(10);
      ws.column(3).setWidth(18);
      ws.column(4).setWidth(16);
      ws.cell(1, 1).string('#');
      ws.cell(1, 2).string('Time');
      ws.cell(1, 3).string('Qty').style({alignment: {horizontal: 'right'}});
      ws.cell(1, 4).string('Price').style({alignment: {horizontal: 'right'}});

      totalv.forEach((v, i) => {
        let style = styleGreen;
        if (v.isBuyerMaker) {
          style = styleRed;
        }
        let time = moment(v.time).utc().utcOffset(this.timeZone).format("HH:mm:ss");
        ws.cell(i + 2, 1).string((i + 1).toString()).style(style);
        ws.cell(i + 2, 2).string(time).style(style);
        ws.cell(i + 2, 3).string(v.qty).style(style).style({alignment: {horizontal: 'right'}});
        ws.cell(i + 2, 4).string(v.price).style(style).style({alignment: {horizontal: 'right'}});
      });

      let fileName = `${symbol}_${moment().utc().utcOffset(this.timeZone).format("DD_MM")}.xlsx`;
      wb.write(fileName, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve({file: fileName, stats: stats});
        }
      });
    });

  }

  /**
   [
   {
    "id": 28457,
    "price": "4.00000100",
    "qty": "12.00000000",
    "time": 1499865549590,
    "isBuyerMaker": true, //False: Green, True: Red
    "isBestMatch": true
  }
   ]
   * @param symbol
   */
  fetchRecentTrade = (symbol: string) => {
    return new Promise((resolve, reject) => {
      request(
        `https://api.binance.com/api/v1/trades?symbol=${symbol.toUpperCase()}&limit=1000`,
        (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            printLog.log('Body: ' + body);
            let values = JSON.parse(body);
          }
        }
      );
    });
  };

  /**
   [
   {
    "id": 28457,
    "price": "4.00000100",
    "qty": "12.00000000",
    "time": 1499865549590,
    "isBuyerMaker": true,
    "isBestMatch": true
  }
   ]

   * @param symbol
   * @param fromId
   * @param limit
   */
  fetchMarketTrade = (symbol: string, fromId: number = -1, limit: number = 500) => {
    //url: `https://api.binance.com/api/v1/historicalTrades?symbol=${symbol.toUpperCase()}&limit=500&fromId=667381`
    let url = `https://api.binance.com/api/v1/historicalTrades?symbol=${symbol.toUpperCase()}&limit=${limit}`;
    if (fromId !== -1) url += `&fromId=${fromId}`;
    return new Promise((resolve, reject) => {
      request(
        {
          url: url,
          headers: {
            'X-MBX-APIKEY': 'jlIE3wxAuAFB8YHmEDAwxiHFrVpTEEuoR1femAxl7QGrKLyMwDYzIMXJDKtSkBfx'
          }
        },
        (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            resolve(JSON.parse(body));
          }
        }
      );
    });
  };

  /**
   * Fetch market trade in current day
   * @param symbol
   * @param totalv
   * @param fromId
   * @param limit
   */
  fetchMarketTradeToday = (symbol: string, totalv: any[], fromId: number = -1, limit: number = 500) => {
    return this.fetchMarketTrade(symbol, fromId, limit).then((values) => {
      if (Array.isArray(values) && values.length) {
        let first = values[0];
        totalv = values.concat(totalv);
        let today = moment().utc().utcOffset(this.timeZone);
        if (moment(first.time).utc().utcOffset(this.timeZone).isSame(today, 'day')) {
          return this.fetchMarketTradeToday(symbol, totalv, first.id - limit);
        }
        return Promise.resolve(totalv.filter(v => moment(v.time).utc().utcOffset(this.timeZone).isSame(today, 'day')));
      }
      return Promise.reject('values is not array')
    });
  };


}
