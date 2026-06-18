export const INDIA_MERCHANT_MAP = {
  swiggyinstamart: "Groceries", instamart: "Groceries",
  swiggy: "Food", zomato: "Food", blinkit: "Groceries", zepto: "Groceries",
  zeptoonline: "Groceries", "zepto online": "Groceries",
  dunzo: "Groceries", bigbasket: "Groceries", "big basket": "Groceries",
  dominos: "Food", "pizza hut": "Food", mcdonald: "Food", kfc: "Food",
  starbucks: "Food", "cafe coffee day": "Food", ccd: "Food",
  subway: "Food", "burger king": "Food", eatfit: "Food", faasos: "Food",
  behrouz: "Food", ovenstory: "Food", freshmenu: "Food",

  ola: "Transport", uber: "Transport", rapido: "Transport", metro: "Transport",
  namma: "Transport", petrol: "Transport", diesel: "Transport", hpcl: "Transport",
  iocl: "Transport", bpcl: "Transport", fastag: "Transport",
  irctc: "Travel", makemytrip: "Travel", goibibo: "Travel", cleartrip: "Travel",
  easemytrip: "Travel", indigo: "Travel", "air india": "Travel",
  spicejet: "Travel", vistara: "Travel", redbus: "Travel", abhibus: "Travel",

  amazon: "Shopping", flipkart: "Shopping", myntra: "Shopping", ajio: "Shopping",
  meesho: "Shopping", nykaa: "Shopping", "tata cliq": "Shopping",
  snapdeal: "Shopping", reliance: "Shopping", zara: "Shopping", hnm: "Shopping",
  decathlon: "Shopping", croma: "Shopping", jiomart: "Groceries",
  dmart: "Groceries", more: "Groceries", spencers: "Groceries",

  airtelpayment: "Bills", "airtel payment": "Bills", airtel: "Bills", jio: "Bills", "vi ": "Bills", vodafone: "Bills", bsnl: "Bills",
  "tata sky": "Bills", "dish tv": "Bills", electricity: "Bills", water: "Bills", "/wate": "Bills",
  bescom: "Bills", msedcl: "Bills", mahadiscom: "Bills", torrent: "Bills",
  act: "Bills", hathway: "Bills", excitel: "Bills", gas: "Bills",
  netflix: "Entertainment", spotify: "Entertainment", "prime video": "Entertainment",
  hotstar: "Entertainment", disney: "Entertainment", zee5: "Entertainment",
  "youtube premium": "Entertainment", bookmyshow: "Entertainment",

  apollo: "Health", medplus: "Health", netmeds: "Health", "1mg": "Health",
  pharmeasy: "Health", practo: "Health", "cult.fit": "Health", "cure.fit": "Health",
  hospital: "Health", clinic: "Health", diagnostic: "Health",

  urbancompany: "Household", "urban company": "Household", pinelabs: "Shopping", "pine labs": "Shopping",
  fd: "Savings", "fixed deposit": "Savings", "for fd": "Savings",
  phonepe: "Transfers", paytm: "Transfers", ptyes: "Transfers", "google pay": "Transfers", gpayrefund: "Income", gpay: "Transfers",
  "upi p2p": "Transfers", "p2p": "Transfers", "bharatpe": "Transfers", cred: "Bills",

  salary: "Salary", "neft cr salary": "Salary", "salary credit": "Salary",
  "neft cr": "Income", "imps cr": "Income", "upi cr": "Income",
  "rtgs cr": "Income", refund: "Income", interest: "Income",
  emi: "Bills", loan: "Bills", rent: "Rent", insurance: "Bills",

  unacademy: "Education", byju: "Education", coursera: "Education",
  udemy: "Education", upgrad: "Education", skillshare: "Education",
};

export function preclassifyMerchant(description = "") {
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(INDIA_MERCHANT_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}
