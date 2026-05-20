
export const generateOTP = (length = 6) => {
  // Define character sets
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let otp = '';

  // Iterate to generate a random OTP of the specified length
  for (let i = 0; i < length; i++) {
    // Choose a random index from the characters string
    const randomIndex = Math.floor(Math.random() * characters.length);
    // Append the character at the random index to the otp
    otp += characters[randomIndex];
  }

  return otp;
};



