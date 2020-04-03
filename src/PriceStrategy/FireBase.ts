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

// https://console.firebase.google.com
import * as admin from 'firebase-admin'
import printLog from 'chalk-printer'
import IMarket from "./market/IMarket";


/**
 * This class for auto backup config to firestore
 *
 * Firestore data format
 Symbols {
	default: {
		data: string //ect: "ethbtc"
	},
	production: {
		: string //ect: "ethbtc"
	}
}

 * How to use:
 // Init firebase market flow
 FireBase.setEnv(this.config.env);
 FireBase.initMarket(this);

 // Update value
 FireBase.setSymbols(...);

 // Notify update
 FireBase.notiUpdate();

 */
export namespace FireBase {

  const SYMBOLS = 'Symbols';
  const serviceAccount = require("../../key/ntrade-77f3f-firebase-adminsdk-8w7s9-3dfde61223.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ntrade-77f3f.firebaseio.com"
  });
  admin.firestore().settings({timestampsInSnapshots: true});

  let market: IMarket;
  let timeoutUpdate: any = null;
  let env = 'default';

  // Export function
  // Set env
  export function setEnv(_env: string) {
    env = _env;
  }

  // Get symbols data from cloud
  export function getSymbols(): Promise<string> {
    let table = admin.firestore().collection(SYMBOLS);
    return table.doc(env).get().then((querySnapshot: any) => querySnapshot.data().data);
  }

  // Update new config to cloud
  export function setSymbols(symbols) {
    let table = admin.firestore().collection(SYMBOLS);
    table.doc(env).set({'data': symbols}, {merge: true})
      .then(function () {
        printLog.log("Firestore update successfully: ", symbols);
      })
      .catch(function (error) {
        printLog.error("Firestore error:", error);
      });
  }

  // Get market ref
  export function initMarket(_market: IMarket) {
    market = _market;
  }

  // Update to cloud by 5s delay to avoid extreme changing
  export function notiUpdate() {
    if (timeoutUpdate) {
      clearTimeout(timeoutUpdate);
    }
    timeoutUpdate = setTimeout(() => {
      if (market) {
        FireBase.setSymbols(market.currentSymbol().toString());
      }
      printLog.log('Trigger update')
    }, 5000)
  }

}
