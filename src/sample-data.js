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
    id: 'health-0',
    target: 'Cow #07 (Chandi)',
    type: 'Mastitis / Vet Treatment',
    dateGiven: '2026-06-12',
    intervalDays: 30,
    medicine: 'Intramammary antibiotic course (5 days)',
    disease: 'Mastitis (rear left quarter)',
    cost: 3200,
    status: 'Booster Completed'
  },
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

const GOATS = [
  {
    id: 'goat-1',
    tag: 'Goat #01 (Bholi)',
    species: 'Goat',
    sex: 'Female',
    breed: 'Beetal',
    ageMonths: 26,
    weightKg: 48,
    count: 1,
    status: 'Milking',
    cost: 38000,
    salePrice: 0,
    notes: '2 litres milk per day'
  },
  {
    id: 'goat-2',
    tag: 'Sheep flock A',
    species: 'Sheep',
    sex: 'Female',
    breed: 'Kajli',
    ageMonths: 18,
    weightKg: 40,
    count: 12,
    status: 'In flock',
    cost: 0,
    salePrice: 0,
    notes: 'Grazing group; shearing in spring'
  }
];

const HORSES = [
  {
    id: 'horse-1',
    name: 'Raja',
    breed: 'Nukra',
    sex: 'Stallion',
    ageYears: 6,
    color: 'White',
    purpose: 'Riding',
    status: 'Active',
    monthlyCost: 18000,
    cost: 450000,
    salePrice: 0,
    notes: 'Shoeing due next month'
  }
];

const LANDS = [
  {
    id: 'land-1',
    name: 'Canal-side field',
    ownership: 'Own',
    area: 8,
    unit: 'Acre',
    theeka: 0,
    owner: 'Chak 12',
    water: 'Tubewell - Solar',
    notes: 'Good loam soil, near the canal'
  },
  {
    id: 'land-2',
    name: 'Ch. Aslam field (Theeka)',
    ownership: 'Theeka',
    area: 4,
    unit: 'Acre',
    theeka: 160000,
    owner: 'Ch. Aslam',
    water: 'Rented Tubewell',
    notes: 'Rented for the year'
  }
];

const CROPS = [
  {
    id: 'crop-1',
    crop: 'Wheat',
    cropOther: '',
    season: 'Rabi (Winter)',
    year: 2026,
    landId: 'land-1',
    area: 4,
    areaUnit: 'Acre',
    ownership: 'Own',
    sowingDate: '2025-11-12',
    seedVariety: 'Akbar-19 (certified seed)',
    seedRate: 50,
    water: 'Tubewell - Solar',
    irrigations: 5,
    notes: 'Harvested in April',
    status: 'Harvested',
    costs: [
      { id: 'cost-1', category: 'Land Preparation', label: '2 ploughing + rotavator + planking', amount: 14000, date: '2025-11-08' },
      { id: 'cost-2', category: 'Seed', label: 'Akbar-19, 200 kg', amount: 24000, date: '2025-11-12' },
      { id: 'cost-3', category: 'Water / Irrigation', label: 'Solar tubewell upkeep', amount: 6000, date: '2025-12-20' },
      { id: 'cost-4', category: 'Fertiliser', label: '4 bags DAP + 6 bags urea', amount: 42000, date: '2025-12-01' },
      { id: 'cost-5', category: 'Pesticide / Spray', label: 'Weedicide spray', amount: 3500, date: '2026-01-10' },
      { id: 'cost-6', category: 'Labour', label: 'Sowing, irrigation, harvest labour', amount: 20000, date: '2026-04-10' }
    ],
    harvests: [{ id: 'harvest-1', date: '2026-04-18', qty: 160, unit: 'Maund (40 kg)', income: 336000, note: 'Sold at Rs. 2,100 per maund' }]
  },
  {
    id: 'crop-2',
    crop: 'Barseem (Egyptian Clover)',
    cropOther: '',
    season: 'Rabi (Winter)',
    year: 2026,
    landId: 'land-2',
    area: 2,
    areaUnit: 'Acre',
    ownership: 'Theeka',
    sowingDate: '2026-10-20',
    seedVariety: 'Local barseem',
    seedRate: 8,
    water: 'Rented Tubewell',
    irrigations: 3,
    notes: 'Fodder for the milkers',
    status: 'Growing',
    costs: [
      { id: 'cost-7', category: 'Land Rent (Theeka)', label: 'Share of yearly Theeka', amount: 40000, date: '2026-10-20' },
      { id: 'cost-8', category: 'Seed', label: '16 kg barseem seed', amount: 9600, date: '2026-10-20' },
      { id: 'cost-9', category: 'Water / Irrigation', label: 'Rented tubewell hours', amount: 7500, date: '2026-11-02' }
    ],
    harvests: []
  }
];

const SAVINGS = [
  {
    id: 'goal-1',
    name: 'New milking cow (Sahiwal)',
    target: 400000,
    targetDate: '2027-03-31',
    createdDate: '2026-08-01',
    notes: 'Buy one high-yield cow before summer',
    contributions: [
      { id: 'gc-1', date: '2026-08-15', amount: 100000, note: 'From cattle sale' },
      { id: 'gc-2', date: '2026-10-05', amount: 60000, note: 'Monthly saving' }
    ]
  },
  {
    id: 'goal-2',
    name: 'Shed roof repair',
    target: 80000,
    targetDate: '2026-12-15',
    createdDate: '2026-09-10',
    notes: '',
    contributions: [
      { id: 'gc-3', date: '2026-09-20', amount: 30000, note: 'Starting balance' }
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
  doodhiAccounts: DOODHI,
  goats: GOATS,
  horses: HORSES,
  lands: LANDS,
  crops: CROPS,
  savingsGoals: SAVINGS
};
