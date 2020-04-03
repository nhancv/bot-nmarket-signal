/**
 * Use:
 import * as ENV from "./env";
 const config = ENV.get();


 t.me/NTradeBot
 t.me/AnomousBot
 */
const config = {
  production: {
    env: 'production',
    bot: {
      name: "NTradeBot",
      token: "801836714:AAFbT-TamyD6YBfqJUJHgIZnnguqGtQBf0o",
      channelDefault: -256505523,
      admin: [359085943, 509328069]
    },
    market: {
      symbol: "btcusdt",
      maximumConn: 100
    }
  },
  default: {
    env: 'default',
    bot: {
      name: "AnomousBot",
      token: "768541669:AAFtaU-MeJcgu_eLFrSjSEMln3kdk1tlQNk",
      channelDefault: -241658123,
      admin: [359085943]
    },
    market: {
      symbol: "btcusdt",
      maximumConn: 100
    }
  }
};


const NODE_ENV = process.env.NODE_ENV;

export function get(env?: string) {
  let conf = config.default;
  if (!env && NODE_ENV) env = NODE_ENV;
  if (env) conf = config[env] || conf;
  return conf;
}
