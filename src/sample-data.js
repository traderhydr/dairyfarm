// Starter records used by "Load Sample Data" (new accounts start empty).
const TRANSACTIONS = [
  {
    id: 'tx-1',
    type: 'income',
    date: '2026-10-28',
    category: 'Milk Sale',
    amount: 14500,
    note: 'Morning & evening milk collection (72.5 L @ Rs. 200/L)'
  },
  {
    id: 'tx-2',
    type: 'expense',
    date: '2026-10-20',
    category: 'Concentrate / Wanda',
    amount: 30000,
    note: '2nd Wanda installment (October 2026 Stock)'
  },
  {
    id: 'tx-3',
    type: 'expense',
    date: '2026-10-27',
    category: 'AI & Breeding Fee',
    amount: 1800,
    note: 'AI straw & vet visit for Cow #14 (Rani)'
  }
];

const BREEDING = [
  {
    id: 'cow-1',
    cowTag: 'Cow #07 (Chandi)',
    aiDate: '2026-08-15',
    semenBull: 'Holstein Friesian (Imported)',
    pregStatus: 'Confirmed Pregnant',
    notes: 'PD confirmed positive at 60 days; dry off 2 months before calving'
  },
  {
    id: 'cow-2',
    cowTag: 'Cow #14 (Rani)',
    aiDate: '2026-10-27',
    semenBull: 'Sahiwal Elite #402',
    pregStatus: 'Awaiting PD Check',
    notes: 'Watch for 21-day repeat heat around Nov 17'
  }
];

const WANDA = [
  {
    id: 'wanda-1',
    monthLabel: 'October 2026 Stock',
    purchaseDate: '2026-10-01',
    supplier: 'Punjab Feeds Dealer (20% CP Dairy Wanda)',
    bags: 30,
    ratePerBag: 4000,
    totalBill: 120000,
    installments: [
      { id: 'inst-1', date: '2026-10-01', amount: 30000, note: 'Advance on delivery (Week 1)' },
      { id: 'inst-2', date: '2026-10-10', amount: 30000, note: '1st milk bill installment (Week 2)' },
      { id: 'inst-3', date: '2026-10-20', amount: 30000, note: '2nd installment paid (Week 3)' }
    ]
  }
];

const MILKERS = [
  {
    id: 'milker-1',
    tag: 'Cow #07 (Chandi)',
    breed: 'Holstein Friesian (2nd Lactation)',
    morningMilk: 12.5,
    eveningMilk: 11.5,
    status: 'Peak / High Yield',
    notes: '8 kg high-protein Wanda + green barseem daily'
  },
  {
    id: 'milker-2',
    tag: 'Cow #14 (Rani)',
    breed: 'Sahiwal Cross (3rd Lactation)',
    morningMilk: 8.0,
    eveningMilk: 7.5,
    status: 'Steady Milking',
    notes: '5 kg Wanda daily; recently inseminated'
  }
];

const WACHI = [
  {
    id: 'wachi-1',
    tag: 'Wachi #01 (Noori)',
    breed: 'HF Cross (Dam: Cow #07 Chandi)',
    ageMonths: 16,
    weightKg: 275,
    stage: 'Ready for 1st AI',
    notes: 'Reached target breeding weight; watch for heat signs this week'
  },
  {
    id: 'wachi-2',
    tag: 'Wachi #02 (Sohni)',
    breed: 'Sahiwal Pure (Dam: Cow #14 Rani)',
    ageMonths: 9,
    weightKg: 155,
    stage: 'Growing Wachi (6–15 Months)',
    notes: 'Dewormed 15 Oct; 2 kg growth Wanda + green fodder'
  }
];

const HEALTH = [
  {
    id: 'health-1',
    target: 'Whole Herd (Milkers & Wachi)',
    type: 'FMD Vaccine (Munh Khur)',
    dateGiven: '2026-09-15',
    intervalDays: 180,
    medicine: 'Imported FMD Trivalent Booster',
    cost: 4500,
    status: 'Scheduled Booster'
  },
  {
    id: 'health-2',
    target: 'All Wachi (Heifers #01 & #02)',
    type: 'Deworming (Drench / Bolus)',
    dateGiven: '2026-10-15',
    intervalDays: 90,
    medicine: 'Nilzan Plus Oral Drench',
    cost: 1200,
    status: 'Scheduled Booster'
  }
];

const SALES = [
  {
    id: 'sale-1',
    cowTag: 'Cow #04 (Lali — Sahiwal Cross)',
    saleDate: '2026-10-18',
    buyer: 'Chaudhry Tariq (Okara Dairy Farm) — 0301-7654321',
    totalCost: 235000,
    salePrice: 295000,
    notes: 'Full payment received in cash; sold after 3rd lactation'
  }
];

const DOODHI = [
  {
    id: 'doodhi-1',
    buyerName: 'Malik Riaz Doodhi (0300-8899112)',
    monthLabel: 'October 2026 Milk Khata',
    startDate: '2026-10-01',
    liters: 1125,
    ratePerLiter: 200,
    totalBill: 225000,
    payments: [
      { id: 'dpay-1', date: '2026-10-01', amount: 80000, note: 'Monthly Peshgi (Advance)' },
      { id: 'dpay-2', date: '2026-10-15', amount: 75000, note: 'Mid-month cash installment' }
    ]
  }
];

export const SAMPLE_DATA = {
  transactions: TRANSACTIONS,
  breedingRecords: BREEDING,
  wandaBatches: WANDA,
  milkersList: MILKERS,
  wachiList: WACHI,
  healthRecords: HEALTH,
  cattleSales: SALES,
  doodhiAccounts: DOODHI
};
