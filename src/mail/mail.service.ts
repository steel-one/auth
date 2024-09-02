import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface IMailUser {
  email: string;
  name: string;
  code: string;
}

interface ISendMail {
  to: string;
  subject: string;
  message: string;
}

@Injectable()
export class MailService {
  async sendUserConfirmation(user: IMailUser, link: string) {
    return this.send({
      to: user.email,
      subject: 'IPlan Registration.',
      message: `<p>Dear, ${user.name}. To confirm your IPlan registration, Please, click: ${link}</p>`,
    });
  }

  async sendRecoveryInstructions(email: string, link: string, agent: string) {
    return this.send({
      to: email,
      subject: 'IPlan Recovering Access.',
      message: `<p>IPlan Recovering requested from ${agent}</p>
      <p>To recover your IPlan access, Please, click: ${link}</p>`,
    });
  }

  async send({ to, subject, message }: ISendMail) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.GOOGLE_MAIL_APP_EMAIL,
        pass: process.env.GOOGLE_MAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GOOGLE_MAIL_APP_EMAIL,
      to,
      subject,
      html: message,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
