import { htmlToText } from 'html-to-text';
import nodemailer from 'nodemailer';
import pug from 'pug';
import pdf from 'html-pdf';
import moment from 'moment';
import FlightModel from '../model/flight.model';
import path from 'path';
import fs from 'fs';

const buildSupportClientUrl = (ticketId: string) => {
  const baseUrl =
    process.env.CLIENT_FRONTEND_URL ||
    process.env.CLIENT ||
    process.env.REACT_APP_FRONTEND_URL ||
    '';

  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/support/${ticketId}` : '';
};

const buildSupportAdminUrl = (ticketId: string) => {
  const baseUrl =
    process.env.UIS_FRONTEND_URL ||
    process.env.ADMIN ||
    process.env.VITE_FRONTEND_URL ||
    '';

  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/tickets/${ticketId}` : '';
};

export class Email {
  to: string;
  firstName: string;
  url: string;
  from: string;

  constructor(user: any, url: string) {
    this.to = user.email;
    this.firstName =
      user.firstName ||
      (typeof user.name === 'string' ? user.name.split(' ')[0] : '') ||
      'Customer';
    this.url = url;
    this.from = process.env.SMTP_EMAIL_FROM as string;
  }

  private newTransport() {
    return nodemailer.createTransport({
      host: process.env.SMTP_EMAIL_HOST,
      port: parseInt(process.env.SMTP_EMAIL_PORT as string, 10),
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL_USER,
        pass: process.env.SMTP_EMAIL_PASSWORD,
      },
    });
  }  

  private async send(
    template: string,
    subject: string,
    body: string,
    context: Record<string, unknown> = {}
  ) {
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      { firstName: this.firstName, url: this.url, subject, body, ...context }
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html)
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 minutes)',
      'body'
    );
  }

  async sendOTP(otp: string) {
    await this.send('OTP', `Umoja airways OTP valid for 5 minutes`, otp);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Umojaairways!', 'body');
  }

  async sendJourneyInvite(inviterName: string, inviterEmail: string) {
    await this.send(
      'journeyInvite',
      `${inviterName} invited you to join Umoja Airways`,
      'body',
      { inviterName, inviterEmail }
    );
  }

  async sendJourneyShared(sharerName: string, sharerEmail: string, journeyId: string) {
    await this.send(
      'journeyShared',
      `${sharerName} shared a live journey with you`,
      'body',
      { sharerName, sharerEmail, journeyId }
    );
  }

  async sendFriendAccepted(friendName: string, friendEmail: string) {
    await this.send(
      'friendAccepted',
      `${friendName} accepted your friend request`,
      'body',
      { friendName, friendEmail }
    );
  }

  async sendGooglePasswordSetup(generatedPassword: string) {
    await this.send(
      'googlePasswordSetup',
      'Your Umoja Google sign-in details',
      'body',
      { generatedPassword }
    );
  }

  async checkInReminder() {
    try {
      console.log('Sending check-in reminder email');
      const html = pug.renderFile(
        `${__dirname}/../views/emails/checkinreminder.pug`,
        {
          firstName: this.firstName,
          url: this.url
        }
      );

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject: 'Your flight is departing within the next 2 hours!',
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
      console.log('Check-in reminder email sent successfully');
    } catch (error) {
      console.error('Error sending check-in reminder email:', error);
    }
  }

  async announcementEmail(data: any) {
    try {
      console.log('Sending announcement email with data:', data);
      const html = pug.renderFile(
        `${__dirname}/../views/emails/announcement.pug`,
        {
          username: data.firstName,
          announcer: data.announcer,
          title: data.name,
          body: data.body
        }
      );

      const mailOptions = {
        from: this.from,
        to: data.email,
        subject: data.title,
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
      console.log('Announcement email sent successfully');
    } catch (error) {
      console.error('Error sending announcement email:', error);
    }
  }

  async sendReceipt(subject: string, flightInfo: any) {
    try {
      const flightDetails = flightInfo.booking
      console.log(flightDetails)
      const passengers = flightDetails.passengers;
      const formattedDeparture = moment(
        flightDetails.departureTime * 1000
      ).format('MMM DD, YYYY HH:mm');
      const formattedArrival = moment(flightDetails.arrivalTime * 1000).format(
        'MMM DD, YYYY HH:mm'
      );
      const logoFile = path.join(__dirname, '/../views/emails/umoja_airways_white_logo.png');
      const logoData = fs.readFileSync(logoFile).toString('base64');
      const logoDataUrl = `data:image/png;base64,${logoData}`;
      const htmlContent = pug.renderFile(
        `${__dirname}/../views/emails/ticketEmailBody.pug`,
        {
          // firstName: this.firstName,
          flight: flightDetails,
          departureDate: formattedDeparture,
          arrivalTime: formattedArrival,
          passengers,
          logoUrl: logoDataUrl
        }
      );

      const pdfOptions = {
        height: '11.25in',
        width: '8.5in',
        header: { height: '10mm' },
        footer: { height: '10mm' }
      };

      await new Promise((resolve, reject) => {
        pdf
          .create(htmlContent, pdfOptions)
          .toFile('Electronic Ticket.pdf', (err, data) => {
            if (err) return reject(err);
            resolve(data);
          });
      });

      const mailOptions = {
        from: this.from,
        to: flightDetails.additionalInfo.email,
        subject,
        html: htmlContent,
        text: htmlToText(htmlContent),
        attachments: [{ path: 'Electronic Ticket.pdf' }]
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error: any) {
      console.error(`Error sending receipt: ${error.message}`);
    }
  }

  async sendReceipt2(subject: string, flightData: any) {
    try {
      const body = flightData.booking;
      // Assuming passengers is already an array
      const passengers = body.passengers;
  
      // Convert Unix timestamps (in seconds) to milliseconds
      const departureTimeInMs = body.departureTime * 1000;
      const arrivalTimeInMs   = body.arrivalTime * 1000;
  
      // Format departing flight times
      const departureDate = moment(departureTimeInMs).format('MMM DD, YYYY HH:mm');
      const arrivalDate   = moment(arrivalTimeInMs).format('MMM DD, YYYY HH:mm');
  
      // Get the return flight details if available
      const returnFlight = body.returnFlightId
        ? await FlightModel.findById(body.returnFlightId)
        : null;
  
      // Format return flight times if the return flight exists.
      let returnDepartureDate = '';
      let returnArrivalDate   = '';
      if (returnFlight) {
        returnDepartureDate = moment(new Date(returnFlight.departureTime).getTime()).format('MMM DD, YYYY HH:mm');
        returnArrivalDate = moment(new Date(returnFlight.arrivalTime).getTime()).format('MMM DD, YYYY HH:mm');
      }
      
  
      // Read logo file and convert to Base64
      const logoFile = path.join(__dirname, '/../views/emails/umoja_airways_white_logo.png');
      const logoData = fs.readFileSync(logoFile).toString('base64');
      const logoDataUrl = `data:image/png;base64,${logoData}`;
  
      const currentDateTime = new Date();
  
      // Render the email body and PDF template with consistent variable names
      const emailBody2 = pug.renderFile(
        `${__dirname}/../views/emails/ticketEmailBody2.pug`,
        {
          flight: body,
          departureDate,           // for departing flight "Not Valid Before" etc.
          arrivalDate,
          returnFlight,
          returnDepartureDate,     // for the return flight
          returnArrivalDate,
          totalprice: body.totalprice,
          totalBaggages: body.totalBaggages,
          passengers: passengers,
          currentDateTime,
          logoUrl: logoDataUrl
        }
      );
  
      const htmlPug2 = pug.renderFile(
        `${__dirname}/../views/emails/receipt2.pug`,
        {
          flight: body,
          departureDate,
          arrivalDate,
          returnFlight,
          returnDepartureDate,
          returnArrivalDate,
          totalprice: body.totalprice,
          totalBaggages: body.totalBaggages,
          passengers: passengers,
          currentDateTime,
          logoUrl: logoDataUrl
        }
      );
  
      // PDF creation options
      const pdfOptions = {
        height: '11.25in',
        width: '8.5in',
        header: { height: '2mm' },
        footer: { height: '2mm' }
      };
  
      // Create PDF from Pug HTML
      await new Promise((resolve, reject) => {
        pdf
          .create(htmlPug2, pdfOptions)
          .toFile('Electronic Ticket.pdf', (err, data) => {
            if (err) return reject(err);
            console.log('Round-trip Ticket created and emailed successfully');
            resolve(data);
          });
      });
  
      // Mail options
      const mailOptions2 = {
        from: this.from,
        to: body.additionalInfo.email,
        subject,
        html: emailBody2,
        text: htmlToText(emailBody2),
        attachments: [
          {
            path: 'Electronic Ticket.pdf'
          }
        ]
      };
  
      // Send the email
      await this.newTransport().sendMail(mailOptions2);
    } catch (error) {
      console.error(error);
    }
  }

  async sendSupportTicketCreated(ticket: any) {
    try {
      const subject = `Support Ticket Created: ${ticket.title}`;
      const html = pug.renderFile(
        `${__dirname}/../views/emails/supportTicketCreated.pug`,
        {
          firstName: this.firstName,
          ticket,
          ticketUrl: buildSupportClientUrl(ticket.id || ticket._id?.toString?.() || ''),
        }
      );

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending support ticket created email:', error);
    }
  }

  async sendSupportResponse(ticket: any, conversation: any) {
    try {
      const subject = `Response to Support Ticket: ${ticket.title}`;
      const html = pug.renderFile(
        `${__dirname}/../views/emails/supportResponse.pug`,
        {
          firstName: this.firstName,
          ticket,
          conversation,
          ticketUrl: buildSupportClientUrl(ticket.id || ticket._id?.toString?.() || ''),
        }
      );

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending support response email:', error);
    }
  }

  async sendSupportTicketClosed(ticket: any) {
    try {
      const subject = `Support Ticket Closed: ${ticket.title}`;
      const html = pug.renderFile(
        `${__dirname}/../views/emails/supportTicketClosed.pug`,
        {
          firstName: this.firstName,
          ticket,
          ticketUrl: buildSupportClientUrl(ticket.id || ticket._id?.toString?.() || ''),
        }
      );

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending support ticket closed email:', error);
    }
  }

  async sendSupportAssignment(ticket: any, assignedBy?: string) {
    try {
      const subject = `Support Ticket Assigned: ${ticket.ticketNumber}`;
      const html = pug.renderFile(
        `${__dirname}/../views/emails/supportAssignment.pug`,
        {
          firstName: this.firstName,
          ticket,
          assignedBy: assignedBy || 'Support Team',
          ticketUrl: buildSupportAdminUrl(ticket.id || ticket._id?.toString?.() || ''),
        }
      );

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending support assignment email:', error);
    }
  }
  
  async sendPaymentLink(subject: string, paymentLinkDetails: any) {
    const html = pug.renderFile(
      `${__dirname}/../views/emails/paymentLink.pug`,
      {
        emailMe: paymentLinkDetails
      }
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html)
    };

    await this.newTransport().sendMail(mailOptions);
  }
}
