import nodemailer from 'nodemailer';

export default class Mail {
  transporter;
  constructor(email, password) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password
      }
    });
  }

  async sendMail(symbol, timeStr, content, toArr: string[]) {
    let mailOptions = {
      from: '"NTrade 👻" <ntrade@gmail.com>',
      to: toArr.toString(),
      subject: `[NTrade: ${symbol.toUpperCase()}] Hight signal at ${timeStr}`,
      text: content
    };
    // send mail with defined transport object
    await this.transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      }
    });
  }
}
