// utils/helpers.js

// Function to generate a random year
export const getRandomYear = () => {
  const currentYear = new Date().getFullYear();
  const minYear = 1980;
  const range = currentYear - minYear + 1;
  return minYear + Math.floor(Math.random() * range);
};

// Function to format a date as a human-readable string
export const formatDate = (date) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(date).toLocaleDateString(undefined, options);
};

// Function to validate an email address
export const isValidEmail = (email) => {
  // Implement email validation logic here (e.g., using regular expressions)
  return true; // Return true if the email is valid, otherwise false
};
