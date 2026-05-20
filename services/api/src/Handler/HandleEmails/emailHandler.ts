import { Email } from "../../utils/email";

// Function to send booking confirmation email
export const handleBookingEmail = async (customer: any, booking: any) => {
    console.log("booking", booking)

    const tripType = customer.metadata.tripType;
    console.log("meta data", customer.metadata)
    try {
        const email = new Email(booking, `${process.env.CLIENT}/passengers/receipt`);
        const subject = 'Your Umoja Airways Payment Receipt';
        const body = booking;  // Use metadata to build email content

        if (tripType === 'one-way') {
            await email.sendReceipt(subject, body);   // Sends the one-way receipt email
            console.log('4. EMAILHANDLER: ONE-WAY TICKER Email sent successfully!!!');
        } else {
            await email.sendReceipt2(subject, body);  // Sends the round-trip receipt email
            console.log('4. EMAILHANDLER: ROUND-TRIP TICKER Email sent successfully!!!');
        }
    } catch (err) {
        console.error('Error sending email:', err);
    }
};
