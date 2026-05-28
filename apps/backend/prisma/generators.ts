// ─── Data Generators for Seed Script ───────────────
// Realistic Indian + Global data generation

export const FIRST_NAMES_INDIAN_MALE = [
  'Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Arjun',
  'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Rudra',
  'Rohan', 'Neel', 'Karan', 'Amit', 'Rajesh', 'Suresh', 'Deepak', 'Vikram',
  'Sanjay', 'Manish', 'Rahul', 'Nitin', 'Pradeep', 'Sunil', 'Vijay',
  'Akash', 'Gaurav', 'Harsh', 'Kunal', 'Lalit', 'Mohit', 'Naveen', 'Pankaj',
  'Ravi', 'Sachin', 'Tarun', 'Uday', 'Varun', 'Yash', 'Ankur',
];

export const FIRST_NAMES_INDIAN_FEMALE = [
  'Aanya', 'Aaradhya', 'Anaya', 'Diya', 'Ishita', 'Kavya', 'Myra', 'Navya',
  'Pari', 'Sara', 'Ananya', 'Bhavna', 'Chitra', 'Divya', 'Esha', 'Geeta',
  'Heena', 'Isha', 'Jaya', 'Kirti', 'Lata', 'Maya', 'Neha', 'Pooja',
  'Ritu', 'Sneha', 'Tina', 'Uma', 'Vani', 'Yamini', 'Zara', 'Anita',
  'Babita', 'Chandni', 'Deepika', 'Ekta', 'Farah', 'Garima', 'Hina',
];

export const LAST_NAMES_INDIAN = [
  'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Joshi',
  'Nair', 'Menon', 'Iyer', 'Rao', 'Deshmukh', 'Kulkarni', 'Pillai',
  'Malhotra', 'Kapoor', 'Khanna', 'Mehta', 'Shah', 'Agarwal', 'Jain',
  'Bose', 'Sen', 'Das', 'Chakraborty', 'Banerjee', 'Mukherjee', 'Chatterjee',
  'Saxena', 'Srivastava', 'Dubey', 'Mishra', 'Pandey', 'Tiwari',
];

export const FIRST_NAMES_GLOBAL = [
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Olivia', 'Henry', 'Ava',
  'Alexander', 'Isabella', 'Michael', 'Mia', 'Daniel', 'Charlotte', 'Matthew',
  'Amelia', 'David', 'Harper', 'Joseph', 'Evelyn', 'John', 'Abigail',
  'Robert', 'Emily', 'Richard', 'Elizabeth', 'Thomas', 'Sofia', 'Charles',
  'Grace', 'Christopher', 'Victoria', 'Sarah', 'Jessica', 'Ryan', 'Lily',
  'Tyler', 'Chloe', 'Jacob', 'Penelope', 'Lucas', 'Layla', 'Ethan', 'Riley',
  'Mason', 'Zoey', 'Logan', 'Nora', 'Liam', 'Eleanor',
];

export const LAST_NAMES_GLOBAL = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
  'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson',
];

export const CITIES_INDIAN = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Noida', 'Gurgaon', 'Chandigarh',
  'Indore', 'Bhopal', 'Surat', 'Coimbatore', 'Kochi', 'Thiruvananthapuram',
  'Goa', 'Nagpur', 'Patna', 'Ranchi', 'Bhubaneswar', 'Guwahati',
];

export const CITIES_GLOBAL = [
  'New York', 'San Francisco', 'London', 'Dubai', 'Singapore', 'Toronto',
  'Sydney', 'Berlin', 'Paris', 'Tokyo', 'Seattle', 'Austin', 'Chicago',
  'Los Angeles', 'Boston', 'Amsterdam', 'Stockholm', 'Melbourne',
];

export const BANK_NAMES = [
  'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank',
  'Kotak Mahindra Bank', 'Yes Bank', 'IDFC First Bank', 'IndusInd Bank',
  'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank',
];

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash', 'investment'] as const;

export const MERCHANT_NAMES = [
  // Food
  'Zomato', 'Swiggy', 'Dominos', 'McDonalds', 'KFC', 'Starbucks', 'Burger King',
  'Subway', 'Taco Bell', 'Pizza Hut', 'Dunkin Donuts', 'Cafe Coffee Day',
  // Grocery
  'BigBasket', 'Blinkit', 'Zepto', 'Instamart', 'DMart', 'Reliance Fresh',
  'More Supermarket', 'Nature’s Basket', 'Amazon Fresh',
  // Shopping
  'Amazon.in', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa', 'Meesho', 'Tata Cliq',
  'Amazon.com', 'Walmart', 'Target', 'Best Buy', 'Etsy', 'eBay',
  // Entertainment
  'Netflix', 'Amazon Prime', 'Disney+ Hotstar', 'Spotify', 'YouTube Premium',
  'Zee5', 'Sony LIV', 'BookMyShow', 'PVR Cinemas',
  // Transport
  'Uber', 'Ola', 'Rapido', 'Uber Eats', 'Indian Oil', 'BPCL', 'HP Petrol',
  'Metro Card', 'IRCTC', 'RedBus', 'MakeMyTrip', 'Goibibo',
  // Utilities
  'Tata Power', 'Adani Electricity', 'BSES', 'Airtel', 'Jio', 'VI',
  'Hathway Broadband', 'Tata Sky', 'Water Bill',
  // Health
  'Apollo Pharmacy', 'MedPlus', 'Netmeds', 'Practo', 'Cult.fit', 'Gold\'s Gym',
  'Fortis Hospital', 'Apollo Hospital',
  // Subscriptions
  'Google One', 'iCloud', 'Microsoft 365', 'Dropbox', 'Adobe CC', 'Notion',
  'Slack', 'GitHub', 'Medium', 'LinkedIn Premium',
  // EMI
  'HDFC EMI', 'ICICI EMI', 'Bajaj Finserv EMI', 'Tata Capital EMI',
  // UPI
  'Google Pay', 'PhonePe', 'Paytm', 'Amazon Pay',
  // Salary
  'Tech Solutions Pvt Ltd', 'Infosys', 'TCS', 'Wipro', 'Google India',
  'Microsoft India', 'Amazon India', 'Deloitte', 'PwC', 'KPMG',
  'Freelance Payment', 'Consulting Fees', 'Dividend Payment',
  // Rent
  'Rent Payment', 'Housing Society',
];

export const TRANSACTION_DESCRIPTIONS = {
  food: ['Lunch delivery', 'Dinner order', 'Morning coffee', 'Pizza night', 'Weekend brunch'],
  grocery: ['Weekly groceries', 'Monthly supplies', 'Snacks & beverages', 'Vegetables & fruits'],
  shopping: ['Online shopping', 'Clothing purchase', 'Electronics purchase', 'Home decor'],
  entertainment: ['Monthly subscription', 'Movie tickets', 'Concert tickets', 'OTT renewal'],
  transport: ['Cab ride', 'Fuel fill', 'Metro recharge', 'Bus ticket', 'Auto ride'],
  utilities: ['Electricity bill', 'Mobile recharge', 'Broadband bill', 'Water bill', 'Gas bill'],
  health: ['Medicine purchase', 'Doctor consultation', 'Gym membership', 'Health checkup'],
  salary: ['Monthly salary', 'Freelance payment', 'Consulting fee', 'Bonus payment'],
  rent: ['Monthly rent', 'Maintenance fee', 'Society charges'],
};

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function generateIndianPhone(): string {
  const prefixes = ['98', '99', '97', '96', '95', '90', '91', '92', '93', '94', '88', '89', '86', '87', '85', '84', '83', '82', '81', '80'];
  return `+91${randomElement(prefixes)}${String(randomInt(10000000, 99999999))}`;
}

export function generateGlobalEmail(firstName: string, lastName: string): string {
  const domains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'proton.me', 'rediffmail.com', 'yandex.com',
    'company.com', 'startup.co',
  ];
  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${String(randomInt(1, 999))}`,
  ];
  return `${randomElement(formats)}@${randomElement(domains)}`;
}

export function generateAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C5CE7&color=fff&size=200`;
}

export const EMI_REMINDERS = [
  { title: 'Home Loan EMI', amount: 45800, day: 5, account: 'HDFC Bank' },
  { title: 'Car Loan EMI', amount: 18200, day: 10, account: 'ICICI Bank' },
  { title: 'Personal Loan EMI', amount: 7500, day: 3, account: 'Axis Bank' },
  { title: 'Credit Card Payment', amount: 12500, day: 15, account: 'HDFC Credit Card' },
  { title: 'Education Loan EMI', amount: 9200, day: 7, account: 'SBI' },
];

export const SUBSCRIPTION_REMINDERS = [
  { title: 'Netflix Renewal', amount: 649, day: 15 },
  { title: 'Amazon Prime', amount: 1499, day: 20 },
  { title: 'Spotify Premium', amount: 119, day: 12 },
  { title: 'Google One Storage', amount: 130, day: 8 },
  { title: 'Microsoft 365 Family', amount: 699, day: 1 },
  { title: 'Disney+ Hotstar', amount: 899, day: 18 },
  { title: 'LinkedIn Premium', amount: 999, day: 22 },
  { title: 'Medium Membership', amount: 499, day: 16 },
  { title: 'iCloud+', amount: 249, day: 25 },
  { title: 'YouTube Premium', amount: 129, day: 10 },
];

export const UTILITY_REMINDERS = [
  { title: 'Electricity Bill', amount: 2400, day: 10 },
  { title: 'Water Bill', amount: 850, day: 15 },
  { title: 'Broadband Bill', amount: 1499, day: 5 },
  { title: 'Mobile Recharge', amount: 599, day: 28 },
  { title: 'Gas Cylinder Booking', amount: 1053, day: 20 },
  { title: 'DTH Recharge', amount: 399, day: 22 },
  { title: 'Insurance Premium', amount: 15000, day: 30 },
  { title: 'Society Maintenance', amount: 3500, day: 7 },
];

export const MEDICINE_REMINDERS = [
  { title: 'Blood Pressure Medicine', time: '08:00', dose: '1 tablet' },
  { title: 'Thyroid Medicine', time: '07:30', dose: '1 tablet' },
  { title: 'Vitamin D Supplement', time: '12:00', dose: '1 capsule' },
  { title: 'Omega-3 Fish Oil', time: '20:00', dose: '1 capsule' },
  { title: 'Multivitamin', time: '09:00', dose: '1 tablet' },
  { title: 'Iron Supplement', time: '10:00', dose: '1 tablet' },
];
