# NTradeBot

This source implement some strategy for trading bot.

## Price Alert Trading Strategy 
- Alert when Volume up
- Alert when MACD9 > 0

------------

## Tech stack
### Server
- Nodemon
- Typescript
- ExpressJs

## Install
```
npm install
```

## Dev
```
npm start
```


## Build
```
npm run build
npm run production
npm run heroku
```

## Deploy to Heroku
```
heroku login
heroku create <app name>
git add .
git commit -m 'deploy to heroku'
git push heroku master

Test at: <app name>.herokuapp.com
Log view: heroku logs -t
``` 
